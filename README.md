# blurt-fanbase
This is a simple Fanbase tool for the BLURT Blockchain to upvote x accounts each 24 hours.

# Requeriments

* NodeJS: "dotenv", "moment", "mysql", "node-fetch", "@blurtfoundation/blurtjs"
* PhpMyAdmin
* PM2

# Installation

Create a new MySql Database and import ```fanbase.sql``` in your phpmyadmin.

You will see 3 tables:

* Queue
* Settings
* Trailers

Go to ```settings``` table and add a new row. You will can set: 

* account: BLURT username to use as curator account.
* posting: BLURT posting key.
* vote_comment: (0/1) upvote comments, set as 0 to dont do it.
* diff_time: (hours) set the time in hours to upvote every account, default 24.
* category: only vote posts in a specified category (First tag).
* tag: only vote posts using a specified tag.
* enable: (0/1) disable/enable your bot, set as 0 to disable it.
* min_vp: set a minimum voting power to upvote posts.

On the ```trailers``` table you will can add as much accounts as you want and set a fixed percentage, these accounts will be voted once every x hours with the percentage used.

Create a ```.env``` file with the following structure:

> DB_USER=root 
> DB_PASSWORD=password
> DB_NAME=fanbase
> DB_HOST=localhost

and set your MySql Db connection.

Run the script using PM2 just do:

```pm2 start index.js --cron "*/15 * * * *"```

You are done