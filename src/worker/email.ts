interface PurchaseEmailData {
  order: string
  voucherCode: string
  userName: string
  hours: number
  amountEur: number
}

// Fire-and-forget via ctx.waitUntil — never throws, never blocks the payment response.
export async function sendPurchaseEmails(
  apiKey: string | undefined,
  data: PurchaseEmailData,
): Promise<void> {
  if (!apiKey) {
    console.log(JSON.stringify({
      event: 'email.skipped',
      reason: 'no_api_key',
      order: data.order,
    }))
    return
  }

  try {
    // TODO: implement member confirmation + admin copy when email templates are ready
    // POST to https://api.resend.com/emails with Bearer apiKey
    throw new Error('Email templates not yet implemented')
  } catch (err) {
    // email.failed is the metric to alert on — it means a confirmed payment
    // did not get an email notification sent.
    console.error(JSON.stringify({
      event: 'email.failed',
      order: data.order,
      voucher_code: data.voucherCode,
      error: err instanceof Error ? err.message : String(err),
    }))
    // Do NOT rethrow — email failure must never affect the purchase record or the 200 to Redsys
  }
}
