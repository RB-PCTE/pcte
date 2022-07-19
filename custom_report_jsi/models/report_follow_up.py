# -*- coding: utf-8 -*-

from odoo import models
from odoo.tools.translate import _


class account_report_followup(models.AbstractModel):
    _inherit = "account.followup.report"

    def _get_default_summary(self, options):
        super(account_report_followup, self)._get_default_summary(options=options)
        partner = self.env['res.partner'].browse(options['partner_id'])
        msg = _('''Dear %s,

Our records indicate that some invoices on your account are still due for payment. The details are listed below. If the overdue amounts have already been paid, kindly disregard this notice. Otherwise, please make payment as soon as possible.
Should you have any queries regarding your account, you can direct them to admin@pcte.com.au

Thank you in advance for your cooperation.

Best Regards,''' % partner.name)
        return msg

    def get_invoice_numbers(self, options):
        name = []
        partner = options.get('partner_id') and self.env['res.partner'].browse(options['partner_id']) or False
        if not partner:
            return []
        res = {}
        for unreconciled_aml in partner.unreconciled_aml_ids:
            if self.env.context.get('print_mode') and unreconciled_aml.blocked:
                continue
            currency = unreconciled_aml.currency_id or unreconciled_aml.company_id.currency_id
            if currency not in res:
                res[currency] = []
            res[currency].append(unreconciled_aml)
        for currency, aml_recs in res.items():
            aml_recs = sorted(aml_recs, key=lambda aml: aml.blocked)
            for aml in aml_recs:
                name.append(aml.move_id.name)
        return name

    def get_html(self, options, line_id=None, additional_context=None):
        if additional_context is None:
            additional_context = {}
        additional_context['invoice_numbers'] = ', '.join(self.get_invoice_numbers(options))
        return super(account_report_followup, self).get_html(options=options, line_id=line_id, additional_context=additional_context)
