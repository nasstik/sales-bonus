/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    const discount = 1 - purchase.discount / 100;
    return purchase.sale_price * purchase.quantity * discount;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    const { profit } = seller;
    if (index === 0) {
        return profit * (15 / 100);
    } else if (index === 1 || index === 2) {
        return profit * (10 / 100);
    } else if (index === total - 1) {
        return 0;
    } else {
        return profit * (5 / 100);
    }
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    const { calculateRevenue, calculateBonus } = options;
    if (
        !data ||
        !Array.isArray(data.sellers) ||
        !Array.isArray(data.products) ||
        !Array.isArray(data.purchase_records) ||
        data.sellers.length === 0 ||
        data.products.length === 0 ||
        data.purchase_records.length === 0
    ) {
        throw new Error("Некорректные входные данные");
    }
    if (
        typeof calculateRevenue !== "function" ||
        typeof calculateBonus !== "function"
    ) {
        throw new Error("Некоторые функции не определены");
    }
    const sellerStats = data.sellers.map((seller) => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {},
    }));

    const sellerIndex = sellerStats.reduce(
        (result, item) => ({
            ...result,
            [item.id]: item,
        }),
        {}
    );
    const productIndex = data.products.reduce(
        (result, item) => ({
            ...result,
            [item.sku]: item,
        }),
        {}
    );

    data.purchase_records.forEach((record) => {
        // Чек
        const seller = sellerIndex[record.seller_id]; // Продавец

        seller.sales_count++;
        seller.revenue += record.total_amount;

        record.items.forEach((item) => {
            const product = productIndex[item.sku]; // Товар
            let cost = product.purchase_price * item.quantity; //посчитала себестоимость одного товара из чека
            let revenue = calculateRevenue(item, product); //посчитала выручку с учетом скидки
            let profit = revenue - cost;

            seller.profit += profit;

            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += item.quantity;
        });
    });
    sellerStats.sort((a, b) => b.profit - a.profit);

    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonus(index, sellerStats.length, seller); // Считаем бонус
        const entries = Object.entries(seller.products_sold);
        const products = entries.map(([sku, quantity]) => ({ sku, quantity }));
        products.sort((a, b) => b.quantity - a.quantity);
        seller.top_products = products.slice(0, 10); // Формируем топ-10 товаров
    });

    return sellerStats.map((seller) => ({
        seller_id: seller.id, // Строка, идентификатор продавца
        name: seller.name, // Строка, имя продавца
        revenue: +seller.revenue.toFixed(2), // Число с двумя знаками после точки, выручка продавца
        profit: +seller.profit.toFixed(2), // Число с двумя знаками после точки, прибыль продавца
        sales_count: seller.sales_count, // Целое число, количество продаж продавца
        top_products: seller.top_products, // Массив объектов вида: { "sku": "SKU_008","quantity": 10}, топ-10 товаров продавца
        bonus: +seller.bonus.toFixed(2), // Число с двумя знаками после точки, бонус продавца
    }));
}
