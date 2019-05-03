'use strict';

require('dotenv').config();

const express = require('express');
const app = express();
const superagent = require('superagent');
const cors = require('cors');
const pg = require('pg');

app.use(cors());
const PORT = process.env.PORT || 3000;

const client = new pg.Client(process.env.DATABASE_URL);
client.connect();

let locationID;

function Location(query, res) {
  this.search_query = query;
  this.formatted_query = res.body.results[0].formatted_address;
  this.latitude = res.body.results[0].geometry.location.lat;
  this.longitude = res.body.results[0].geometry.location.lng;
}

function Weather(day) {
  this.forecast = day.summary;
  this.time = new Date(day.time * 1000).toDateString();
}

function Event(event) {
  this.link = event.url;
  this.name = event.name.text;
  this.event_date = new Date(Date.parse(event.start.local)).toDateString();
  this.summary = event.summary;
}

app.get('/location', (req, res) => {
  getLatLong(req.query.data)
    .then(location => res.send(location))
    .catch(err => handleError(err, res));
});

app.get('/weather', getWeather);
app.get('/events', getEvents);

function getLatLong(query) {

  let sqlStatement = 'SELECT * FROM locations WHERE search_query = $1';
  const values = [ query];
  return client.query(sqlStatement, values)
    .then((data) => {
      if (data.rowCount > 0) {
        return data.rows[0];
      } else {
        const geocodeURL = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${process.env.GEOCODE_API_KEY}`;

        return superagent.get(geocodeURL)
          .then(res => {
            const newLocation = new Location(query, res);
            let insertStatement = 'INSERT INTO locations (search_query, formatted_query, latitude, longitude) VALUES ($1, $2, $3, $4)';
            const insertValues = [newLocation.search_query, newLocation.formatted_query, newLocation.latitude, newLocation.longitude];
            client.query(insertStatement, insertValues);

            let sqlStatement='SELECT id FROM locations WHERE search_query=$1';
            const values=[newLocation.search_query];
            return client.query(sqlStatement,values)
              .then((data)=>{
                locationID = data.rows[0].id;
                return newLocation;
              });
          })
          .catch(error => handleError(error));
      }
    });
}

function getWeather(req, res) {
  // lookupDatabase('weather',req.query.data,res);
  let sqlStatement= searchDb('weather');
  let url=`https://api.darksky.net/forecast/${process.env.WEATHER_API_KEY}/${req.query.data.latitude},${req.query.data.longitude}`;
  lookupDatabase(sqlStatement,req.query.data,res,url);

}

function getEvents(req, res) {
  let sqlStatement= searchDb('events');
  let url=`https://www.eventbriteapi.com/v3/events/search?location.address=${req.query.data.formatted_query}`;
  lookupDatabase(sqlStatement,req.query.data,res,url);
}



//query=req.query.data
function searchDb(tableName){
  let sqlStatement='';
  if(tableName==='weather'){
    sqlStatement='SELECT * FROM weather WHERE location_id=$1;';
  }
  if(tableName==='events'){
    sqlStatement=`SELECT * FROM events WHERE location_id=$1;`;
  }
  return sqlStatement;
}



function exist(data,res){
  res.send(data);
}


function notExist(url,res){
  if(!url.includes('events')){
    superagent.get(url)
      .then(result => {
        const weatherSummaries = result.body.daily.data.map(day => {
          const newWeather=new Weather(day);
          let insertStatement='INSERT INTO weather (forecast,time,location_id) VALUES ($1,$2,$3)';
          let weatherValues=[newWeather.forecast,newWeather.time,locationID];
          client.query(insertStatement,weatherValues);
          return newWeather;
        });
        res.send(weatherSummaries);
      });

  }
  else{
    superagent.get(url)
      .set('Authorization', `Bearer ${process.env.EVENTBRITE_API_KEY}`)
      .then(result => {
        const events = result.body.events.map(eventData => {
          const newevent = new Event(eventData);
          let insertStatement='INSERT INTO events (link,name,event_date,summary,location_id) VALUES ($1,$2,$3,$4,$5)';
          let eventValues=[newevent.link,newevent.name,newevent.event_date,newevent.summary,locationID];
          client.query(insertStatement,eventValues);
          return newevent;
        });
        res.send(events);
      });

  }


}


function lookupDatabase(sqlStatement,query,res,url){
  const values=[query.id];
  return client.query(sqlStatement,values)
    .then((data)=>{
      if(data.rowCount>0){
        console.log('get data from db');
        exist(data.rows,res);
      }
      else{
        notExist(url,res);
      }
    });

}





app.get('/yelp',getYelp);
//yelp constructor 
function Yelp(item){
  this.name=item.name;
  this.rating=item.rating;
  this.price=item.price;
  //   this.phone=item.phone;
  this.image_url=item.image_url;
}


function getYelp(request,response){
  const handler={
    location: request.query.data,
    cacheHit: function(result){
      response.send(result.rows);
    },
    cacheMiss: function(){
      Yelp.getYelpinfo(request.query.data)
        .then(results=>response.send(results))
        .catch(console.error);
    },

  };

  Yelp.findYelp(handler);

}

//save to db
Yelp.prototype.save=function(id){
  const SQL = `INSERT INTO yelps (name,rating,price,image_url,location_id) VALUES ($1,$2,$3,$4,$5);`;
  const values=Object.values(this);
  values.push(id);
  client.query(SQL,values);
};


Yelp.findYelp=function(handler){
  const SQL= `SELECT * FROM yelps WHERE location_id=$1`;
  client.query(SQL,[handler.location.id])
    .then(result=>{
      if(result.rowCount>0){
        handler.cacheHit(result);
      }
      else{
        handler.cacheMiss();
      }
    });

};


Yelp.getYelpinfo=function(location){

  const url= `https://api.yelp.com/v3/businesses/search?location=${location.latitude},${location.longitude}`;
  return superagent.get(url)
    .set('Authorization', `Bearer ${process.env.YELP_API_KEY}`)
    .then(result=>{
      const yelpSummaries=result.body.businesses.map(item=>{
        const summary =new Yelp(item);
        summary.save(location.id);
        return summary;
      });
      return yelpSummaries;
    });

};


app.get('/movies',getMovies);
//movie constructor
function Movie(item){
  this.title=item.title;
  this.overview=item.overview;
  this.average_votes=item.vote_average;
  this.total_votes=item.vote_count;
  this.image_url='https://image.tmdb.org/t/p/w370_and_h556_bestv2/' + item.poster_path;
  this.release_date=item.release_date;
  this.popularity=item.popularity;
  this.released_on=item.release_data;
}

function getMovies(request,response){
  const handler={
    location: request.query.data,
    cacheHit: function(result){
      response.send(result.rows);
    },
    cacheMiss: function(){
      Movie.getMovieinfo(request.query.data)
        .then(results=>response.send(results))
        .catch(console.error);
    },
  };
  Movie.findMovie(handler);
}


Movie.prototype.save=function(id){
  const SQL = `INSERT INTO movies (title,overview,average_votes,total_votes,image_url,release_date,popularity,released_on,location_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9);`;
  const values=Object.values(this);
  values.push(id);
  client.query(SQL,values);
};



Movie.findMovie=function(handler){
  const SQL= `SELECT * FROM movies WHERE location_id=$1`;
  client.query(SQL,[handler.location.id])
    .then(result=>{
      if(result.rowCount>0){
        handler.cacheHit(result);
      }
      else{
        handler.cacheMiss();
      }
    });
};



Movie.getMovieinfo=function(location){
  const url= `https://api.themoviedb.org/3/search/movie?api_key=${process.env.MOVIE_API_KEY}&query=${location.search_query}`;
  return superagent.get(url)
    .then(resultupdate=>{
      const movieSummaries=resultupdate.body.results.map(item=>{
        const summary =new Movie(item);
        summary.save(location.id);
        return summary;
      });
      return movieSummaries;
    });
};



function handleError(err, res) {

  console.error(err);
  if (res) res.status(500).send('Status: 500 - Internal Server Error');
}

app.listen(PORT, () => console.log(`listening on port ${PORT}`));
