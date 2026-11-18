ALTER TABLE lessons DROP CONSTRAINT lessons_kind_check;
ALTER TABLE lessons ADD CONSTRAINT lessons_kind_check CHECK (kind IN ('lecture','practice','lab','exam','credit'));
