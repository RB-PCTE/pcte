# -*- coding: utf-8 -*-

{
    "name": "Custom reports(Sale, Purchase, Delivery)",
    "summary": """
        add new reports in Sale, Purchase and stock app
        """,
    "category": "",
    "version": "15.0.1.0.0",
    "author": "Odoo PS",
    "website": "https://www.odoo.com",
    "license": "OEEL-1",
    'depends': ['sale_stock', 'purchase', 'account_followup'],
    'data': [
        'views/sale_view.xml',
        'views/reports.xml',
        'views/layout_templates.xml',
        'views/report_sale_quote.xml',
        'views/report_invoice.xml',
        'views/report_purchase.xml',
        'views/report_delivery.xml',
        'views/report_followup_pdf.xml',
    ],
}
