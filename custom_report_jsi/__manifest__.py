# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

{
    'name': 'Custom reports(Sale, Purchase, Delivery)',
    'category': 'Sale',
    'sequence': 60,
    'description': "It will add new reports in Sale, Purchase and stock app.",
    'depends': ['sale_stock', 'purchase'],
    'data': [
        'views/sale_view.xml',
        'views/reports.xml',
        'views/layout_templates.xml',
        'views/report_sale_quote.xml',
        'views/report_invoice.xml',
        'views/report_purchase.xml',
        'views/report_delivery.xml',
        'report_followup_pdf.xml',
        ],
    'demo': [],
    'installable': True,
    'auto_install': False,
}
