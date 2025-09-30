SELECT 
    m.merchant_id,
    m.company_name,
        m.full_name,
    COUNT(st.id) AS scheduled_task_count,
    COALESCE(SUM(t.original_amount), 0) AS total_transaction_amount
FROM 
    "Merchant" m
LEFT JOIN 
    "Transaction" t ON m.merchant_id = t.merchant_id
LEFT JOIN 
    "ScheduledTask" st ON t.transaction_id = st."transactionId"
WHERE 
    (st.status = 'pending' and
        st."scheduledAt">$1 and st."scheduledAt"<$2)
GROUP BY 
    m.merchant_id, m.company_name, m.full_name
ORDER BY 
    m.merchant_id;