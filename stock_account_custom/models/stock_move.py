# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.
from odoo import models, fields, exceptions, api, _
import logging
_logger = logging.getLogger(__name__)


class StockMove(models.Model):
    _inherit = 'stock.move'

    def _get_price_unit(self):
        """ Returns the unit price to store on the quant """
        price_unit = super(StockMove, self)._get_price_unit()
        _logger.info("Price unit of _get_price_unit is {}".format(price_unit))
        if self.price_unit != price_unit:
            _logger.info("Difference is True: {}".format(self.price_unit))
            return self.price_unit
        else:
            return price_unit