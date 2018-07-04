# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.
from odoo import models, fields, api, exceptions

class ShippingInformationLine(models.Model):
    _name = 'shipping.info.line'

    shipping_type = fields.Selection([('air', 'Air'), ('parcel', 'Parcel'), ('sea', 'Sea')])
    shipping_info_id = fields.Many2one('shipping.info')
    currency_id = fields.Many2one('res.currency', related='shipping_info_id.currency_id')
    range_1_amount = fields.Monetary(currency_field='currency_id')
    range_2_amount = fields.Monetary(currency_field='currency_id')
    range_3_amount = fields.Monetary(currency_field='currency_id')
    range_4_amount = fields.Monetary(currency_field='currency_id')


class ShippingInformation(models.Model):
    _name = 'shipping.info'

    name = fields.Char()
    air_range_1_min = fields.Float()
    air_range_1_max = fields.Float()
    air_range_2_min = fields.Float()
    air_range_2_max = fields.Float()
    air_range_3_min = fields.Float()
    air_range_3_max = fields.Float()
    air_range_4_min = fields.Float()
    air_range_4_max = fields.Float()

    parcel_range_1_min = fields.Float()
    parcel_range_1_max = fields.Float()
    parcel_range_2_min = fields.Float()
    parcel_range_2_max = fields.Float()
    parcel_range_3_min = fields.Float()
    parcel_range_3_max = fields.Float()
    parcel_range_4_min = fields.Float()
    parcel_range_4_max = fields.Float()

    sea_range_1_min = fields.Float()
    sea_range_1_max = fields.Float()
    sea_range_2_min = fields.Float()
    sea_range_2_max = fields.Float()
    sea_range_3_min = fields.Float()
    sea_range_3_max = fields.Float()
    sea_range_4_min = fields.Float()
    sea_range_4_max = fields.Float()



    shipping_lines_ids = fields.One2many('shipping.info.line', 'shipping_info_id')
    supplier_info_id = fields.Many2one('product.supplierinfo')
    currency_id = fields.Many2one('res.currency', related='supplier_info_id.currency_id')


    @api.model
    def create(self, vals):
        res = super(ShippingInformation, self).create(vals)
        supplier_info = self.env['product.supplierinfo'].search([('shipping_info_id', '=', res.id)])
        res.write({'supplier_info_id': supplier_info.id})
        return res

    @api.constrains('air_range_1_min', 'air_range_1_max', 'air_range_2_min', 'air_range_2_max,', 'air_range_3_min', 'air_range_3_max', 'air_range_4_min', 'air_range_4_max')
    def air_check_ranges(self):
        ranges = ['air_range_1_min', 'air_range_1_max', 'air_range_2_min', 'air_range_2_max', 'air_range_3_min', 'air_range_3_max', 'air_range_4_min', 'air_range_4_max']
        for info in self:
            if info.air_range_1_min < 0:
                raise exceptions.ValidationError("Cannot have a negative value for range")
            for i in range(1, len(ranges)):
                if info[ranges[i - 1]] and info[ranges[i]] and info[ranges[i - 1]] > info[ranges[i]]:
                    raise exceptions.ValidationError("Cannot have overlapping ranges (Air)")

    @api.constrains('parcel_range_1_min', 'parcel_range_1_max', 'parcel_range_2_min', 'parcel_range_2_max,', 'parcel_range_3_min', 'parcel_range_3_max', 'parcel_range_4_min', 'parcel_range_4_max')
    def parcel_check_ranges(self):
        ranges = ['parcel_range_1_min', 'parcel_range_1_max', 'parcel_range_2_min', 'parcel_range_2_max', 'parcel_range_3_min', 'parcel_range_3_max', 'parcel_range_4_min', 'parcel_range_4_max']
        for info in self:
            if info.parcel_range_1_min < 0:
                raise exceptions.ValidationError("Cannot have a negative value for range")
            for i in range(1, len(ranges)):
                if info[ranges[i - 1]] and info[ranges[i]] and info[ranges[i - 1]] > info[ranges[i]]:
                    raise exceptions.ValidationError("Cannot have overlapping ranges (parcel)")

    @api.constrains('sea_range_1_min', 'sea_range_1_max', 'sea_range_2_min', 'sea_range_2_max,', 'sea_range_3_min', 'sea_range_3_max', 'sea_range_4_min', 'sea_range_4_max')
    def sea_check_ranges(self):
        ranges = ['sea_range_1_min', 'sea_range_1_max', 'sea_range_2_min', 'sea_range_2_max', 'sea_range_3_min', 'sea_range_3_max', 'sea_range_4_min', 'sea_range_4_max']
        for info in self:
            if info.sea_range_1_min < 0:
                raise exceptions.ValidationError("Cannot have a negative value for range")
            for i in range(1, len(ranges)):
                if info[ranges[i - 1]] and info[ranges[i]] and info[ranges[i - 1]] > info[ranges[i]]:
                    raise exceptions.ValidationError("Cannot have overlapping ranges (sea)")

    @api.constrains('shipping_lines_ids.shipping_type')
    @api.onchange('shipping_lines_ids')
    def check_line_types(self):
        types = self.shipping_lines_ids.mapped('shipping_type')
        for t in types:
            num = types.count(t)
            if num > 1:
                raise exceptions.ValidationError("Cannot have twice the same shipping type: %s" % t)

    def get_amount(self, qty, shipping_type):
        line = self.shipping_lines_ids.filtered(lambda l: l.shipping_type == shipping_type)
        if not line:
            return 0

        if qty >= line.shipping_info_id[shipping_type + '_range_1_min'] and qty <= line.shipping_info_id[shipping_type + '_range_1_max']:
            return line.range_1_amount
        if qty >= line.shipping_info_id[shipping_type + '_range_2_min'] and qty <= line.shipping_info_id[shipping_type + '_range_2_max']:
            return line.range_2_amount
        if qty >= line.shipping_info_id[shipping_type + '_range_3_min'] and qty <= line.shipping_info_id[shipping_type + '_range_3_max']:
            return line.range_3_amount
        if qty >= line.shipping_info_id[shipping_type + '_range_4_min'] and qty <= line.shipping_info_id[shipping_type + '_range_4_max']:
            return line.range_4_amount
        return 0


class ProductSupplierInfo(models.Model):
    _inherit = "product.supplierinfo"

    shipping_info_id = fields.Many2one('shipping.info')
    landed_cost_actual = fields.Monetary(currency_field='currency_id')

class ProductTemplate(models.Model):
    _inherit = "product.template"

    supplier_discount = fields.Float(string="Supplier Discount(%)")
    default_landed_cost_actual = fields.Monetary(currency_field='currency_id')
    default_shipping_info_id = fields.Many2one('shipping.info')

class PurchaseOrderLine(models.Model):
    _inherit = "purchase.order.line"

    discount = fields.Float(string="Discount(%)")

    @api.onchange('product_id')
    def onchange_product_discount(self):
        self.discount = self.product_id and self.product_id.supplier_discount

    @api.model
    def create(self, vals):
        if not vals.get('discount'):
            vals['discount'] = vals.get('product_id') and self.env['product.product'].browse(vals.get('product_id')).supplier_discount
        return super(PurchaseOrderLine, self).create(vals)

    @api.depends('product_qty', 'price_unit', 'taxes_id', 'discount')
    def _compute_amount(self):
        for line in self:
            if line.discount:
                price_unit = line.price_unit * (100.0 - line.discount) / 100.0
            else:
                price_unit = line.price_unit
            taxes = line.taxes_id.compute_all(price_unit, line.order_id.currency_id, line.product_qty, product=line.product_id, partner=line.order_id.partner_id)
            line.update({
                'price_tax': sum(t.get('amount', 0.0) for t in taxes.get('taxes', [])),
                'price_total': taxes['total_included'],
                'price_subtotal': taxes['total_excluded'],
            })
