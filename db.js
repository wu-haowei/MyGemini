// This script assumes Dexie.js is already loaded from the HTML file.
const databaseService = {
    db: null,

    init: function() {
        this.db = new Dexie('ShoppingCartDB');
        this.db.version(5).stores({
            products: 'id, name, price, stock, brand, rating, images, deleted',
            cart: '++id, &productId, name, price, quantity',
            orders: '++id, orderId, total, paymentMethod, timestamp, deliveryStatus, deliveryHistory',
            stockHistory: '++id, productId, timestamp, oldStock, newStock, reason',
            carouselImages: '++id, &url',
            reviews: '++id, [orderId+productId], productId, rating, comment, timestamp'
        });
        return this.db.open().catch(err => {
            console.error("Failed to open DB: " + err.stack || err);
        });
    },

    // Generic CRUD methods
    getAll: function(storeName) {
        return this.db[storeName].toArray();
    },

    getItem: function(storeName, key) {
        return this.db[storeName].get(key);
    },
    
    getItemWhere: function(storeName, criteria) {
        return this.db[storeName].where(criteria);
    },

    addItem: function(storeName, item) {
        return this.db[storeName].add(item);
    },

    updateItem: function(storeName, key, changes) {
        return this.db[storeName].update(key, changes);
    },

    deleteItem: function(storeName, key) {
        return this.db[storeName].delete(key);
    },

    clearStore: function(storeName) {
        return this.db[storeName].clear();
    },
    
    bulkAdd: function(storeName, items) {
        return this.db[storeName].bulkAdd(items);
    },

    // Complex Transaction Methods
    addToCart: async function(product) {
        return this.db.transaction('rw', this.db.cart, async () => {
            const existingItem = await this.db.cart.where('productId').equals(product.id).first();
            if (existingItem) {
                if (existingItem.quantity >= product.stock) {
                    throw new Error('maxQuantityReached');
                }
                return this.db.cart.update(existingItem.id, {
                    quantity: existingItem.quantity + 1
                });
            } else {
                return this.db.cart.add({
                    productId: product.id,
                    name: product.name,
                    price: product.price,
                    quantity: 1
                });
            }
        });
    },
    
    updateCartQuantity: async function(item, change, productStock) {
        const newQuantity = item.quantity + change;
        if (change > 0 && newQuantity > productStock) {
            throw new Error('maxQuantityReached');
        }
        
        if (newQuantity <= 0) {
            return this.db.cart.delete(item.id);
        } else {
            return this.db.cart.update(item.id, { quantity: newQuantity });
        }
    },

    processCheckout: async function(order, cart) {
        return this.db.transaction('rw', this.db.orders, this.db.products, this.db.cart, this.db.stockHistory, async () => {
            // 1. Add order
            await this.db.orders.add(order);

            // 2. Update stock and log history
            for (const cartItem of cart) {
                const productInDb = await this.db.products.get(cartItem.productId);
                if (productInDb) {
                    const oldStock = productInDb.stock;
                    const newStock = oldStock - cartItem.quantity;
                    await this.db.products.update(productInDb.id, { stock: newStock });
                    await this.db.stockHistory.add({
                        productId: productInDb.id,
                        timestamp: new Date().toISOString(),
                        oldStock,
                        newStock,
                        reason: `Order ${order.orderId}`
                    });
                }
            }

            // 3. Clear cart
            await this.db.cart.clear();
        });
    },

    deleteProduct: async function(productId) {
        return this.db.transaction('rw', this.db.products, this.db.cart, async () => {
            await this.db.products.update(productId, { deleted: true });
            await this.db.cart.where('productId').equals(productId).delete();
        });
    },
    
    updateProductDetails: async function(product, details) {
         return this.db.transaction('rw', this.db.products, this.db.cart, this.db.stockHistory, async () => {
            await this.db.products.update(product.id, {
                name: details.name,
                price: details.price,
                stock: details.stock,
                brand: details.brand,
                images: details.images
            });

            // Update cart items with new product name and price
            const cartItemsToUpdate = await this.db.cart.where('productId').equals(product.id).toArray();
            for (const cartItem of cartItemsToUpdate) {
                await this.db.cart.update(cartItem.id, { name: details.name, price: details.price });
            }

            if (details.stockChanged) {
                await this.db.stockHistory.add({
                    productId: product.id,
                    timestamp: new Date().toISOString(),
                    oldStock: product.stock,
                    newStock: details.stock,
                    reason: details.stockChangeReason
                });
            }
        });
    },
    
    seedData: async function(data) {
        return this.db.transaction('rw', this.db.products, this.db.carouselImages, async () => {
            if (data.products && Array.isArray(data.products)) {
                await this.db.products.bulkAdd(data.products);
            }
            if (data.carouselImages && Array.isArray(data.carouselImages)) {
                await this.db.carouselImages.bulkAdd(data.carouselImages);
            }
        });
    }
}; 