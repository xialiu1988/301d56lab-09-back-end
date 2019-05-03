DROP TABLE IF EXISTS loactions;
DROP TABLE IF EXISTS weather;
DROP TABLE IF EXISTS events;

CREATE TABLE locations (
  id SERIAL PRIMARY KEY,
  latitude DECIMAL,
  longitude DECIMAL,
  formatted_query VARCHAR(255),
  search_query VARCHAR(255)
);

CREATE TABLE weather(
id SERIAL PRIMARY KEY,
forecast VARCHAR(255),
time VARCHAR(255),
location_id INTEGER,
FOREIGN KEY(location_id) REFERENCES locations(id)
);


CREATE TABLE events(
id SERIAL PRIMARY KEY,
link VARCHAR(255),
name VARCHAR(255),
event_date VARCHAR(255),
summary VARCHAR(255),
location_id INTEGER,
FOREIGN KEY(location_id) REFERENCES locations(id)
);
