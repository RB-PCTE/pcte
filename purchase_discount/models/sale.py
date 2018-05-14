# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.
from odoo import models, fields, exceptions, api


class SaleOrderLine(models.Model):
    _inherit = "sale.order.line"

    shipping_type = fields.Selection([('air', 'Air'), ('parcel', 'Parcel'), ('sea', 'Sea')], default='air')
    product_lca = fields.Boolean(compute="product_has_lca", store=True)


    @api.depends('order_id.partner_id', 'product_id')
    def product_has_lca(self):
        for rec in self:
            if rec.product_id.default_landed_cost_actual or rec.product_id.seller_ids.filtered(lambda s: s.name == rec.order_id.partner_id).landed_cost_actual:
                rec.product_lca = True
            else:
                rec.product_lca = False

    def get_landed_cost_predicted(self):
        product = self.product_id
        partner = self.order_id.partner_id
        qty = self.product_uom_qty
        ship_info = product.seller_ids.filtered(lambda s: s.name == partner).shipping_info_id
        if ship_info:
            amount = ship_info.get_amount(qty, self.shipping_type)
        if not ship_info or not amount:
            ship_info = product.default_shipping_info_id
            if ship_info:
                amount = ship_info.get_amount(qty, self.shipping_type)
            else:
                raise exceptions.ValidationError("Did not find shipping information for product %s" % product.name)

        return amount

    @api.onchange('product_id', 'order_partner_id', 'product_uom_qty')
    def get_selling_price(self):
        PI = self.product_id.seller_ids.filtered(lambda s: s.name == self.order_id.partner_id).price or self.product_id.standard_price
        D = self.product_id.supplier_discount
        if self.product_id.currency_id and self.currency_id:
            DPC = self.product_id.currency_id.compute(PI * (100.0 - D) / 100.0, self.currency_id)
        else:
            DPC = PI * (100.0 - D) / 100.0

        if self.product_has_lca:
            LC = self.product_id.seller_ids.filtered(lambda s: s.name == self.order_id.partner_id).landed_cost_actual or self.product_id.default_landed_cost_actual
        else:
            LC_R = self.get_landed_cost_predicted()
            LC_1 = LC_R * self.product_id.weight
            LC_2 = LC_R * 200 * self.product_id.volume
            LC = max(LC_1, LC_2)

        #TODO MARGIN
        pricelist = self.order_id.partner_id.property_product_pricelist
        if pricelist:
            pricelist_item = pricelist.item_ids.filtered(lambda p: p.compute_price == 'formula' and p.applied_on == '1_product' and (p.product_id == self.product_id or p.product_tmpl_id == self.product_id.product_tmpl_id))
            if not pricelist_item:
                pricelist_item = pricelist.item_ids.filtered(lambda p: p.compute_price == 'formula' and p.applied_on == '2_product_category' and p.categ_id == self.product_id.categ_id)
            if not pricelist_item:
                pricelist_item = pricelist.item_ids.filtered(lambda p: p.compute_price == 'formula' and p.applied_on == '3_global')
            if not pricelist_item:
                raise exceptions.ValidationError("Did not find pricelist items for pricelist: %s and product %s" % (self.order_id.partner_id.property_product_pricelist.name, self.product_id.name))
        else:
            raise exceptions.ValidationError("Customer doesn't have a sale pricelist!")

        M = pricelist_item[0].price_min_margin

        self.price_unit = (DPC + LC) * (1 + M)
