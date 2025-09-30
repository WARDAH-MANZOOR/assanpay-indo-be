SELECT 
        DATE_TRUNC('day', "date_time") as transaction_date, 
        SUM("settled_amount") as total_settled_amount
      FROM 
        "Transaction"
      WHERE 
        "merchant_id" = $1
      GROUP BY 
        transaction_date
      ORDER BY 
        transaction_date ASC;