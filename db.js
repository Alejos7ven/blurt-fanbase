require('dotenv').config()
const moment = require('moment')
class Db {
    constructor() {
        this.data = {
            host : process.env.DB_HOST,
            database : process.env.DB_NAME,
            user : process.env.DB_USER,
            password : process.env.DB_PASSWORD
        }
        this.dbConnection = this.getDataConnection();
    }
    getDataConnection(){
        return this.data;
    }
    getTrailers(connection){
        return new Promise((resolve,reject) =>{
            connection.query('SELECT * FROM trailers', function(err, results){
                if (err)  reject(err);
                else{
                    let users = [];
                    results.forEach((r) => { 
                        users.push({
                            id:r.id,
                            user:r.user,
                            percent:r.percent,
                            last_vote:r.last_vote,
                            voted:r.voted
                        });
                    });
                    resolve(users);
                }
            })
        }).then(r => { return r; })
          .catch(e => {console.log('Fail to get info. ' + e); return false;});
    }
    getCurators(connection){
        return new Promise((resolve,reject) =>{
            connection.query('SELECT * FROM settings WHERE enable = 1', function(err, results){
                if (err)  reject(err);
                else{
                    let users = [];
                    results.forEach((r) => { 
                        users.push({
                            id:r.id,
                            account:r.account,
                            posting:r.posting,
                            vote_comment:r.vote_comment,
                            diff_time:r.diff_time,
                            category:r.category,
                            tag:r.tag,
                            enable:r.enable,
                            min_vp:r.min_vp,
                            current_vp:100
                        });
                    });
                    resolve(users);
                }
            })
        }).then(r => { return r; })
          .catch(e => {console.log('Fail to get info. ' + e); return false;});
    }
    getQueue(connection){
        return new Promise((resolve,reject) =>{
            connection.query('SELECT * FROM queue', function(err, results){
                if (err)  reject(err);
                else{
                    let users = [];
                    results.forEach((r) => { 
                        users.push({
                            id:r.id,
                            author:r.author,
                            permlink:r.permlink,
                            percent:r.percent,
                            created:r.created
                        });
                    });
                    resolve(users);
                }
            })
        }).then(r => { return r; })
          .catch(e => {console.log('Fail to get info. ' + e); return false;});
    }
    enqueue(connection, author, permlink, percent){
        return new Promise((resolve,reject) =>{
            let time = moment.utc().format('YYYY-MM-DD HH:mm:ss');
            connection.query(`INSERT INTO queue (author, permlink, percent, created) VALUES ('${author}', '${permlink}', ${percent}, '${time}')`, function(err, results){
                if (err)  reject(err);
                else{
                    resolve(true)
                }
            })
        }).then(r => { return r; })
          .catch(e => {console.log('Fail to add chat. ' + e); return false;});
    }
    removeQueue(connection, id) {
        return new Promise((resolve,reject) =>{ 
            connection.query(`DELETE FROM queue WHERE id=${id}`, function(err, results){
                if (err)  reject(err);
                else{
                    resolve(true)
                }
            })
        }).then(r => { return r; })
          .catch(e => {console.log('Fail to add chat. ' + e); return false;});
    }
    markAsVoted(connection, follower, bool = 0, update_time = true) {
        return new Promise((resolve,reject) =>{ 
            let add = '';
            if (update_time) {
                let time = moment.utc();
                add = `, last_vote='${time}'`
            }
            
            connection.query(`UPDATE trailers SET voted=${bool}${add} WHERE user LIKE '${follower}'`, function(err, results){
                if (err)  reject(err);
                else{
                    resolve(true)
                }
            })
        }).then(r => { return r; })
          .catch(e => {console.log('Fail to add chat. ' + e); return false;});
    }
}
module.exports = Db;