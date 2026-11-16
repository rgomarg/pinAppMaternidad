-- Normalize the seeded users so profile fields are independent.
UPDATE "User" SET "name" = 'Laura', "surname" = 'Pérez', "phone" = '+34 612 345 678'
WHERE "email" = 'laura.pro@example.com';
UPDATE "User" SET "name" = 'Carlos', "surname" = 'Martín', "phone" = '+34 623 456 789'
WHERE "email" = 'carlos.user@example.com';
UPDATE "User" SET "name" = 'Elena', "surname" = 'Gómez', "phone" = '+34 634 567 890'
WHERE "email" = 'elena.admin@example.com';
UPDATE "User" SET "name" = 'Administración', "phone" = '+34 645 678 901'
WHERE "email" = 'admin@example.com';
UPDATE "User" SET "name" = 'Marcos', "surname" = 'Spam', "phone" = '+34 656 789 012'
WHERE "email" = 'spam.user@example.com';
UPDATE "User" SET "name" = 'Marta', "surname" = 'Ruiz', "phone" = '+34 667 890 123'
WHERE "email" = 'marta.pro@example.com';
