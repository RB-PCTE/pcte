# -*- coding: utf-8 -*-

from odoo import models, fields, api, _
from odoo.exceptions import ValidationError


class SaleOrderLine(models.Model):
    _inherit = "sale.order.line"

    shipping_type = fields.Selection([('air', 'Air'), ('parcel', 'Parcel'), ('sea', 'Sea')], default=False)
    product_lca = fields.Boolean(compute="product_has_lca", store=True)

    @api.depends('order_id.partner_id', 'product_id')
    def product_has_lca(self):
        for rec in self:
            if rec.product_id.default_landed_cost_actual or rec.product_id.seller_ids and rec.product_id.seller_ids[0].landed_cost_actual:
                rec.product_lca = True
            else:
                rec.product_lca = False

    def get_landed_cost_predicted(self):
        product = self.product_id
        qty = self.product_uom_qty * max(self.product_id.weight, self.product_id.volume * 200)
        ship_info = product.seller_ids and product.seller_ids[0].shipping_info_id
        if ship_info:
            amount = ship_info.get_amount(qty, self.shipping_type)
        if not ship_info or not amount:
            ship_info = product.default_shipping_info_id
            if ship_info:
                amount = ship_info.get_amount(qty, self.shipping_type)
            else:
                raise ValidationError("Did not find shipping information for product %s" % product.name)
        return amount

    @api.onchange('product_id')
    def product_id_change(self):
        if not self.product_id:
            return {'domain': {'product_uom': []}}

        vals = {}
        domain = {'product_uom': [('category_id', '=', self.product_id.uom_id.category_id.id)]}
        if not self.product_uom or (self.product_id.uom_id.id != self.product_uom.id):
            vals['product_uom'] = self.product_id.uom_id
            vals['product_uom_qty'] = 1.0

        product = self.product_id.with_context(
            lang=self.order_id.partner_id.lang,
            partner=self.order_id.partner_id.id,
            quantity=vals.get('product_uom_qty') or self.product_uom_qty,
            date=self.order_id.date_order,
            pricelist=self.order_id.pricelist_id.id,
            uom=self.product_uom.id
        )

        result = {'domain': domain}

        title = False
        message = False
        warning = {}
        if product.sale_line_warn != 'no-message':
            title = _("Warning for %s") % product.name
            message = product.sale_line_warn_msg
            warning['title'] = title
            warning['message'] = message
            result = {'warning': warning}
            if product.sale_line_warn == 'block':
                self.product_id = False
                return result

        name = product.name_get()[0][1]
        if product.description_sale:
            name += '\n' + product.description_sale
        vals['name'] = name

        self._compute_tax_id()
        self.update(vals)

        return result

    @api.onchange('product_id', 'product_uom_qty', 'shipping_type')
    def get_selling_price(self):
        if self.product_id and self.shipping_type:
            PI = self.product_id.seller_ids and self.product_id.seller_ids[0].price or self.product_id.standard_price
            currency = self.product_id.seller_ids and self.product_id.seller_ids[0].currency_id
            D = self.product_id.supplier_discount
            if currency and self.currency_id and currency != self.currency_id:
                DPC = currency.compute(PI * (100.0 - D) / 100.0, self.currency_id)
            else:
                DPC = PI * (100.0 - D) / 100.0
            if self.product_id.default_landed_cost_actual or self.product_id.seller_ids and self.product_id.seller_ids[0].landed_cost_actual:
                LC = self.product_id.seller_ids and self.product_id.seller_ids[0].landed_cost_actual or self.product_id.default_landed_cost_actual
            else:
                LC_R = self.get_landed_cost_predicted()
                LC_1 = LC_R * self.product_id.weight
                LC_2 = LC_R * 200 * self.product_id.volume
                LC = max(LC_1, LC_2)

            pricelist = self.order_id.pricelist_id or self.order_id.partner_id.property_product_pricelist
            if pricelist:
                pricelist_item = pricelist.item_ids.filtered(lambda p: p.compute_price == 'formula' and p.applied_on == '1_product' and (p.product_id == self.product_id or p.product_tmpl_id == self.product_id.product_tmpl_id))
                if not pricelist_item:
                    pricelist_item = pricelist.item_ids.filtered(lambda p: p.compute_price == 'formula' and p.applied_on == '2_product_category' and p.categ_id == self.product_id.categ_id)
                if not pricelist_item:
                    pricelist_item = pricelist.item_ids.filtered(lambda p: p.compute_price == 'formula' and p.applied_on == '3_global')
                if not pricelist_item:
                    raise ValidationError("Did not find pricelist items for pricelist: %s and product %s" % (self.order_id.partner_id.property_product_pricelist.name, self.product_id.name))
            else:
                raise ValidationError("Customer doesn't have a sale pricelist!")

            M = pricelist_item[0].margin_pcte

            self.price_unit = (DPC + LC) * (1 + M / 100.0)
        else:
            if not self.product_uom or not self.product_id:
                self.price_unit = 0.0
                return
            if self.order_id.pricelist_id and self.order_id.partner_id:
                product = self.product_id.with_context(
                    lang=self.order_id.partner_id.lang,
                    partner=self.order_id.partner_id.id,
                    quantity=self.product_uom_qty,
                    date=self.order_id.date_order,
                    pricelist=self.order_id.pricelist_id.id,
                    uom=self.product_uom.id,
                    fiscal_position=self.env.context.get('fiscal_position')
                )
                self.price_unit = self.env['account.tax']._fix_tax_included_price_company(self._get_display_price(product), product.taxes_id, self.tax_id, self.company_id)

    @api.onchange('product_uom', 'product_uom_qty')
    def product_uom_change(self):
        pass


class PricelistItem(models.Model):
    _inherit = "product.pricelist.item"

    margin_pcte = fields.Float("Margin PCTE")
