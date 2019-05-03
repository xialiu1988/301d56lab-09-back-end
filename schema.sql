DROP TABLE IF EXISTS loactions;
DROP TABLE IF EXISTS weather;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS yelps;
DROP TABLE IF EXISTS movies;

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
created_at BIGINT,
location_id INTEGER,
FOREIGN KEY(location_id) REFERENCES locations(id)
);


CREATE TABLE events(
id SERIAL PRIMARY KEY,
link VARCHAR(255),
name VARCHAR(255),
event_date VARCHAR(255),
summary VARCHAR(255),
created_at BIGINT,
location_id INTEGER,
FOREIGN KEY(location_id) REFERENCES locations(id)
);


CREATE TABLE yelps(
id SERIAL PRIMARY KEY,
name VARCHAR(255),
rating VARCHAR(255),
price VARCHAR(255),
image_url VARCHAR(255),
location_id INTEGER NOT NULL,
FOREIGN KEY (location_id) REFERENCES locations(id)
);

CREATE TABLE movies(
id SERIAL PRIMARY KEY,
title VARCHAR(255),
overview VARCHAR(255),
average_votes VARCHAR(255),
total_votes VARCHAR(255),
image_url VARCHAR(255),
release_date VARCHAR(255),
popularity VARCHAR(255),
released_on VARCHAR(255),
location_id INTEGER NOT NULL,
FOREIGN KEY (location_id) REFERENCES locations(id)
);