SELECT 
    t.transaction_id,
    t.original_amount,
    t.settled_amount,
    (t.original_amount - t.settled_amount) AS profit,
    u.username AS merchant_name
FROM 
    "Transaction" t
JOIN 
    "User" u ON t.merchant_id = u.id
WHERE 
    t.merchant_id = $1;