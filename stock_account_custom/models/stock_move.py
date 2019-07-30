# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.
from odoo import models, fields, exceptions, api, _
import logging
from odoo.tools import float_compare, float_round, float_is_zero, pycompat
_logger = logging.getLogger(__name__)


class StockMove(models.Model):
    _inherit = 'stock.move'

    def _get_price_unit(self):
        """ Returns the unit price to store on the quant """
        use_supplier_price = self.env['ir.config_parameter'].sudo().get_param('stock_account_custom.use_supplier_price')
        price_unit = super(StockMove, self)._get_price_unit()
        _logger.info("Price unit of _get_price_unit is {}".format(price_unit))
        if self.price_unit != price_unit and use_supplier_price:
            _logger.info("Difference is True: {}".format(self.price_unit))
            return self.price_unit
        else:
            return price_unit

    def _get_supplier_price(self, product):
        if len(product.seller_ids) != 1:
            return product.standard_price
        else:
            supplier_price = product.seller_ids[0].currency_id.with_context(date=self.date).compute(product.seller_ids[0].price,self.company_id.currency_id,round=False)
            if product.supplier_discount:
                supplier_price = supplier_price*(1-(product.supplier_discount/100))
            return supplier_price

    def _run_valuation(self, quantity=None):
        self.ensure_one()
        use_supplier_price = self.env['ir.config_parameter'].sudo().get_param('stock_account_custom.use_supplier_price')
        if use_supplier_price:
            if self._is_in():
                valued_move_lines = self.move_line_ids.filtered(lambda
                                                                    ml: not ml.location_id._should_be_valued() and ml.location_dest_id._should_be_valued() and not ml.owner_id)
                valued_quantity = 0
                for valued_move_line in valued_move_lines:
                    valued_quantity += valued_move_line.product_uom_id._compute_quantity(valued_move_line.qty_done,
                                                                                         self.product_id.uom_id)

                # Note: we always compute the fifo `remaining_value` and `remaining_qty` fields no
                # matter which cost method is set, to ease the switching of cost method.
                vals = {}
                price_unit = self._get_price_unit()
                value = price_unit * (quantity or valued_quantity)
                vals = {
                    'price_unit': price_unit,
                    'value': value if quantity is None or not self.value else self.value,
                    'remaining_value': value if quantity is None else self.remaining_value + value,
                }
                vals['remaining_qty'] = valued_quantity if quantity is None else self.remaining_qty + quantity

                if self.product_id.cost_method == 'standard':
                    value = self.product_id.standard_price * (quantity or valued_quantity)
                    vals.update({
                        'price_unit': self.product_id.standard_price,
                        'value': value if quantity is None or not self.value else self.value,
                    })
                self.write(vals)
            elif self._is_out():
                valued_move_lines = self.move_line_ids.filtered(lambda
                                                                    ml: ml.location_id._should_be_valued() and not ml.location_dest_id._should_be_valued() and not ml.owner_id)
                valued_quantity = 0
                for valued_move_line in valued_move_lines:
                    valued_quantity += valued_move_line.product_uom_id._compute_quantity(valued_move_line.qty_done,
                                                                                         self.product_id.uom_id)
                self.env['stock.move']._run_fifo(self, quantity=quantity)
                if self.product_id.cost_method in ['standard', 'average']:
                    curr_rounding = self.company_id.currency_id.rounding
                    price = self._get_supplier_price(self.product_id)
                    value = -float_round(
                        price * (valued_quantity if quantity is None else quantity),
                        precision_rounding=curr_rounding)
                    self.write({
                        'value': value if quantity is None else self.value + value,
                        'price_unit': value / valued_quantity,
                    })
            elif self._is_dropshipped() or self._is_dropshipped_returned():
                curr_rounding = self.company_id.currency_id.rounding
                if self.product_id.cost_method in ['fifo']:
                    price_unit = self._get_price_unit()
                    # see test_dropship_fifo_perpetual_anglosaxon_ordered
                    self.product_id.standard_price = price_unit
                else:
                    price_unit = self.product_id.standard_price
                value = float_round(self.product_qty * price_unit, precision_rounding=curr_rounding)
                # In move have a positive value, out move have a negative value, let's arbitrary say
                # dropship are positive.
                self.write({
                    'value': value if self._is_dropshipped() else -value,
                    'price_unit': price_unit if self._is_dropshipped() else -price_unit,
                })
        else:
            return super(StockMove, self)._run_valuation(quantity=quantity)
