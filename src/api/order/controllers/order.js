'use strict';
// @ts-ignore
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

/**
 * order controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::order.order', ({ strapi }) => ({
  async create(ctx) {
    // @ts-ignore
    const { products, userName, email } = ctx.request.body;

    // @ts-ignore
    console.log('body: ', ctx.request.body);

    try { 
      const lineItems = await Promise.all(
        products.map(async(product) => {
          const item = await strapi
            .service("api::item.item")
            .findOne(product.id );
          return {
            price_data: {
              currency: "usd",
              product_data: {
                name: item.name,
              },
              unit_amount: item.price * 100,
            },
            quantity: product.count,}
        })
      );

      console.log('lineItems: ', lineItems);

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        customer_email: email,
        mode: "payment",
        success_url: "http://localhost:3000/checkout/success",
        cancel_url: "http://localhost:3000",
        line_items: lineItems,
      });

      // create item
      await strapi.service("api::order.order").create({
        data: {
          userName,
          products,
          stripeSessionId: session.id,
        },
      });

      return { id: session.id };

    } catch (error) {
      ctx.response.status = 500;
      console.error('strapi error:::', error);
      return { error: { message: "There was a problem creating the charge"} };
    }
  },
}));
