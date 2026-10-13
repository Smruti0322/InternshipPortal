CREATE TABLE IF NOT EXISTS resume_payments (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    resume_id INT NOT NULL,
    amount INT NOT NULL,
    currency VARCHAR(8) NOT NULL DEFAULT 'INR',
    razorpay_order_id VARCHAR(100) NOT NULL,
    razorpay_payment_id VARCHAR(100) NULL,
    payment_status ENUM('created', 'success', 'failed') NOT NULL DEFAULT 'created',
    paid_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_resume_payment_order (razorpay_order_id),
    UNIQUE KEY uq_resume_payment_payment (razorpay_payment_id),
    KEY idx_resume_payments_user (user_id),
    KEY idx_resume_payments_resume (resume_id),
    CONSTRAINT fk_resume_payments_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_resume_payments_resume FOREIGN KEY (resume_id) REFERENCES resumes(id)
);

CREATE TABLE IF NOT EXISTS resume_invoices (
    id INT NOT NULL AUTO_INCREMENT,
    payment_id INT NOT NULL,
    invoice_number VARCHAR(40) NOT NULL,
    user_id INT NOT NULL,
    resume_id INT NOT NULL,
    customer_email VARCHAR(150) NULL,
    service_description VARCHAR(255) NOT NULL,
    amount INT NOT NULL,
    currency VARCHAR(8) NOT NULL DEFAULT 'INR',
    payment_date DATETIME NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_invoice_number (invoice_number),
    UNIQUE KEY uq_invoice_payment (payment_id),
    CONSTRAINT fk_invoice_payment FOREIGN KEY (payment_id) REFERENCES resume_payments(id),
    CONSTRAINT fk_invoice_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_invoice_resume FOREIGN KEY (resume_id) REFERENCES resumes(id)
);

CREATE TABLE IF NOT EXISTS resume_downloads (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    resume_id INT NOT NULL,
    payment_id INT NOT NULL,
    version_number INT NULL,
    downloaded_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    KEY idx_resume_downloads_user_resume (user_id, resume_id),
    CONSTRAINT fk_download_payment FOREIGN KEY (payment_id) REFERENCES resume_payments(id)
);

CREATE TABLE IF NOT EXISTS resume_versions (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    resume_id INT NOT NULL,
    version_number INT NOT NULL,
    resume_data JSON NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_resume_version (resume_id, version_number),
    CONSTRAINT fk_version_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_version_resume FOREIGN KEY (resume_id) REFERENCES resumes(id)
);
