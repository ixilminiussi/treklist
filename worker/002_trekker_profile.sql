ALTER TABLE trekkers ADD COLUMN weight_kg REAL;
ALTER TABLE trekkers ADD COLUMN sex        TEXT CHECK(sex IN ('M','F','X'));
ALTER TABLE trekkers ADD COLUMN gender     TEXT;
ALTER TABLE trekkers ADD COLUMN birthday   TEXT;
