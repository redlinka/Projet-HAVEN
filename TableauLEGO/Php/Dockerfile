
# Use PHP with Apache
FROM php:8.2-apache

# Install system dependencies, Java, and C compiler
RUN apt-get update && apt-get install -y \
    git \
    curl \
    zip \
    unzip \
    default-jre \
    gcc \
    make \
    && rm -rf /var/lib/apt/lists/*

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Install MySQL extensions (PHP doesn't come with them by default)
RUN docker-php-ext-install pdo pdo_mysql mysqli

# Enable Apache mod_rewrite for clean URLs
RUN a2enmod rewrite

# Set the working directory
WORKDIR /var/www/html

# Copy your repo files into the container
COPY . /var/www/html/

# Make C_tiler executable
RUN chmod +x /var/www/html/img2brick_final/C_tiler