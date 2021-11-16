const blurt = require("@blurtfoundation/blurtjs");
blurt.api.setOptions({ url: 'https://rpc.blurt.world', useAppbaseApi: true });
const Db    = require('./db.js')
const mysql = require('mysql');
const moment = require('moment')
const fetch = require("node-fetch")
let db           = new Db(); 
let refreshTime  = 5000; 
let followers;
let curators;
let queue;

(async () => {
    await bring();
    
    setInterval(() => { 
        bring();
    }, refreshTime);

    setInterval(() => {
        checkQueue()
        checkFollowers();
    }, refreshTime*3);
})()

broadcaster()
function broadcaster() {
    //steem.api.setOptions({ url: 'https://api.steemit.com' });
    blurt.api.streamTransactions('head', (err, result) => {
        try {
            if (err) throw err;
            let t = result.operations[0][0]
            let d = result.operations[0][1]
            
            if (t == 'comment') {
                let add = true
                if (curators[0].vote_comment == 0) {
                    if (d.parent_author != "") add = false;
                }
                let follower = isFollower(d.author)
                if (typeof follower == 'object') {
                    if (curators[0].enable == 1 && follower.voted == 1) {
                        if (curators[0].category != "") {
                            console.log(`The post ${d.author}/${d.permlink} is using the category ${d.parent_permlink}`);
                            if (d.parent_permlink != curators[0].category) add = false;
                        }
                        if (curators[0].tag != "") {
                            let json = JSON.parse(d.json_metadata);
                            let r = json.tags.indexOf(curators[0].tag)
                            if (r == -1) add = false;
                        }
                        if (add) {
                            let connection = mysql.createConnection(db.dbConnection);
                            connection.connect(async (err) => {
                                if (err) throw err; 
                                db.enqueue(connection, d.author, d.permlink, follower.percent)
                                console.log('post added.');
                                setTimeout(() => {
                                    connection.end();
                                }, refreshTime - 500);
                            });
                        }
                        
                    }else {
                        console.log('Already voted today');
                    }
                    
                }
            }
        } catch (error) {
            console.log(error);
            broadcaster();
        }
    });
}
async function checkQueue() {
    if (queue.length > 0) {
        for (let i = 0; i < queue.length; i++) {
            let post = queue[i];
            let now = moment.utc();
            let data = await customApi('condenser_api.get_content', [post.author, post.permlink]);
            data     = JSON.parse(data).result;
            let c = moment.utc(data.created)
            let diff = now.diff(c, "minutes")
            let payout_percent = parseFloat(data.max_accepted_payout);
            let has_voted = has_already_been_voted(curators[0].account, data);
            if (payout_percent == 0) remove(post.id)
            else if (diff >= 5) {
                if (has_voted.length > 0) console.log('removing...'), remove(post.id);
                else if (curators[0].current_vp >= curators[0].min_vp) {
                    sendVote(post);
                }
                
            }
        }
    }
}
async function checkFollowers() {
    if (followers.length > 0) {
        for (let i = 0; i < followers.length; i++) {
            let follower = followers[i];
            if (follower.voted == 0) {
                let last_vote = moment.utc(follower.last_vote);
                let now = moment.utc()
                let diff = now.diff(last_vote, 'hours'); 
                if (diff >= curators[0].diff_time) {
                    mark(follower.user, 1, false);
                }
            }
        }
    }
}
function bring() {
    try {
        let connection = mysql.createConnection(db.dbConnection);
        connection.connect(async (err) => {
            if (err) throw err;
            followers = await db.getTrailers(connection); 
            curators  = await db.getCurators(connection);
            queue     = await db.getQueue(connection);
            let users = []
            for (let i = 0; i < curators.length; i++) {
                users.push(curators[i].account)
                
            }
            updateVP(users)
            setTimeout(() => {
                connection.end();
            }, refreshTime - 500);
        });
    } catch (error) {
        console.log("Error: " + error);
        bring();
    }
}
function updateVP(users){
    return new Promise(async(resolve,reject) =>{ 
        if (users.length > 0) {
            let data = await customApi("condenser_api.get_accounts", [users]); 
            data     = JSON.parse(data).result;
            for (let i = 0; i < data.length; i++) {
                let c = data[i]; 
                if (c.name == curators[i].account) {
                    curators[i].current_vp = getVotingPower(c)
                }
            }
        }
        resolve(true);
    }).then(r => { return r; })
    .catch(e => {console.log('Fail to get info. ' + e); return false;});
}
function getVotingPower(account) {
    let voting_power  = account.voting_power,
    last_vote_time    = new Date(account.last_vote_time + "Z"),
    elapsed_seconds   = (new Date() - last_vote_time) / 1000,
    regenerated_power = Math.round(
    (10000 * elapsed_seconds) / (5 * 24 * 60 * 60)
    );
    let current_power = Math.min(voting_power + regenerated_power, 10000);
    return current_power/100;
}
function remove(id) {
    let connection = mysql.createConnection(db.dbConnection);
    connection.connect(async (err) => {
        if (err) throw err;
        unqueued = db.removeQueue(connection, id);
        setTimeout(() => {
            connection.end();
        }, refreshTime - 500);
    });
}
function mark(follower, bool = 0, update_time = true) {
    let connection = mysql.createConnection(db.dbConnection);
    connection.connect(async (err) => {
        if (err) throw err;
        marked = db.markAsVoted(connection, follower, bool, update_time);
        setTimeout(() => { 
            connection.end();
        }, refreshTime - 500);
    });
}
function isFollower(name){
    if (followers.length > 0) {
        let obj = followers.find(follower => follower.user == name); 
        return (obj == undefined)? false : obj;
    }else return false;
}
function customApi (method, params) {
    return new Promise((resolve, reject) => {
        fetch('https://rpc.nerdtopia.de', {
        method: "POST",
        headers: { 'Content-Type': 'application/json'},
        body: JSON.stringify({"jsonrpc":"2.0","method":method,"params":params,"id":1})
        }).then(response => { resolve(response.text());})
          .catch(error => { reject(error); });
    });
}
function has_already_been_voted(voter, post) {
    return post.active_votes.filter(el => el.voter === voter);
}
function sendVote (post) {
    return new Promise(async(resolve,reject) =>{ 
        let weight = post.percent
        weight = (isNaN(weight))? 10000: weight*100;
        if (weight > 10000) weight = 10000;
        if (weight < 0) weight = 5000; 

        let parent_author = post.author
        let parent_permlink = post.permlink

            //if (voting_power >= min_weight) {
                console.log('upvoting at..', parent_author, parent_permlink, weight);
                blurt.broadcast.vote(
                    curators[0].posting, // posting wif
                    curators[0].account,
                    parent_author, 
                    parent_permlink, 
                    weight,
                    function (err, result) { 
                        if (err) console.log('Failure! ' + err), resolve(false);
                        else {
                            console.log('the post has been upvoted successfully!');
                            remove(post.id)
                            mark(post.author)
                            setTimeout(() => {
                                resolve(true);
                            }, 3000);
                        }
                    }
                );
            // }else {
            //     console.log("Not enough voting power."); resolve(false);
            // }
    }).then(r => { return r; })
    .catch(e => {console.log('Fail to get info. ' + e); return false;});
}