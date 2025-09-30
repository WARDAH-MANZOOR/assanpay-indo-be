SELECT 
        m.merchant_id,
        m.full_name,
        m.company_name,
        COALESCE(SUM(t.settled_amount), 0) AS total_balance,
        COALESCE(SUM(t.original_amount - t.settled_amount), 0) AS profit
      FROM 
        "Merchant" m
      LEFT JOIN 
        "User" u ON u.id = m.merchant_id
      LEFT JOIN 
        "Transaction" t ON t.merchant_id = u.id
      LEFT JOIN
        "MerchantFinancialTerms" mft on mft.merchant_id = m.merchant_id
      WHERE
        t.date_time BETWEEN $1 AND $2
        AND t.status = 'completed'
        AND m.merchant_id=$3
      GROUP BY 
        m.merchant_id, m.full_name, m.company_name, mft."commissionRate";