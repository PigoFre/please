// Dependencies
let path = require('path');
let socketIO = require('socket.io');
let express = require('express');

const app = express();
const gridSize = 32;
let server = require('http').createServer(app);
let io = socketIO(server);
app.set('port', 5000);

//Directory of static files
const static_dir = 'static';
app.use(express.static(static_dir));

// Starts the server.
server.listen(5000, function () {
    console.log('Starting server on port 5000');
});

var players = {};
var collisonMap = {};
let items = [];
let map = autoMapGenerator(0, 100, gridSize);

generateItem(320, 200, "Health Potion", "Consumable", 0,0, 0, 1)
generateItem(220, 200, "Health Potion", "Consumable", 0,0, 0, 1)
generateItem(120, 200, "Health Potion", "Consumable", 0,0, 0, 1)
generateItem(420, 200, "Health Potion", "Consumable", 0,0, 0, 1)

async function jump(player, amount) {
    for (let i = 0; i < amount ; i++) {
            player.y -= 3
        if(checkCollision(player,32,32,32)){
            player.y += 3
            break;
        }
        await sleep(5);
    }
}
function sleep(ms){
    return new Promise(resolve=>{
        setTimeout(resolve,ms)
    })
}
io.on('connection', function (socket) {
    console.log('Player ' + socket.id + ' has joined the game');
    socket.on('new player', function () {
        let Inventory = []
        players[socket.id] = {
            x: 320,
            y: 200,
            status: 0,
            health: 100,
            energy: 100,
            inventory:Inventory
        };
        io.sockets.emit('map', map);
    });
    socket.on('movement', function (data) {
        var player = players[socket.id] || {};
        if (data.a || data.w || data.d || data.s) {
            if (data.a) {
                player.x -= 5;
                player.status = 2;
                if (checkCollision(player, 32, 32, gridSize)) {
                    player.x += 5;
                }
            }
            if (data.w) {
                if (player.onair === false) {
                   player.y -= 4;
                    player.status = 1;
                    jump(player,50);
                    // if (checkCollision(player, 32, 32, gridSize)) {
                    //     player.y += 250;
                    // }
                    player.onair = true;
                }

            }
            if (data.d) {
                player.x += 5;
                player.status = 4;
                if (checkCollision(player, 32, 32, gridSize)) {
                    player.x -= 5;

                }
            }
            if (data.s) {
                player.y += 5;
                player.status = 3;
                if (checkCollision(player, 32, 32, gridSize)) {
                    player.y -= 5;
                }
            }
        } else {
            player.status = 0;
        }
    });
    socket.on('mouseclick', function (click) {
       if(!mineBlock(players[socket.id],click.x,click.y,32)){
           //meleeAttack(players[socket.id],)
       }
        io.sockets.emit('map', map);
    });
    socket.on('disconnect', function (some) {
        console.log('Player ' + socket.id + ' has disconnected.');
        players[socket.id] = 0
    });
});


function autoMapGenerator(startX, amount, gridSize) {
    //Rules
    //world has max 2000 depth mountains and and min 500 depth flat land
    //blocks should be connected and should not defy the laws of gravity(no fling blocks)
    //no extreme changes (a tower of 2000 in an instant should not be possible)
    let minHeight = 10;
    let blocks = [];
    let size = startX + amount;
    if (startX < 0) {
        size = Math.abs(startX) + amount
    }
    let hills = []
    if (amount > 20) {
        let amountOfHills = Math.floor(Math.random() * Math.floor((size / 20)));
        console.log("Amount of Hills: " + amountOfHills)
        for (let i = 0; i < amountOfHills; i++) {
            let hill = {}
            let start = startX + Math.floor(Math.random() * amount);
            let end = start + Math.floor(Math.random() * (amount - start));
            hill["start"] = start
            hill["end"] = end
            //randomize hills lenght
            hills.push(hill);
        }
    }

    for (let i = startX; i < size; i++) {

        collisonMap[i * gridSize - gridSize] = {};
        for (let k = 20; k > minHeight; k--) {
            let block = {};
            collisonMap[i * gridSize - gridSize][k * gridSize - gridSize] = true;
            block["x"] = i * gridSize;
            block["y"] = k * gridSize;
            block["type"] = "dirt";
            block["health"] = 100;
            blocks.push(block);
        }
    }

    for (let hill in hills) {
        let start = hills[hill].start;
        let end = hills[hill].end;
        //console.log(start);
        let size = end - start;
        let middle = start + Math.floor(size / 2);
        //middle = Math.floor(Math.random() * Math.floor(size /10) - Math.floor(size/20))
        //console.log(middle)
        //console.log(end);
        let lastY = minHeight
        for (let i = start; i < middle; i++) {
            let noise = Math.floor(Math.random() * 3)
            try {
                for (let k = minHeight; k > lastY - noise; k--) {
                    let block = {};
                    collisonMap[i * gridSize - gridSize][k * gridSize - gridSize] = true;
                    block["x"] = i * gridSize;
                    block["y"] = k * gridSize;
                    block["type"] = "dirt";
                    block["health"] = 100;
                    blocks.push(block);
                }
                lastY = lastY - noise
            } catch (e) {
                //map not generated for that part yet
            }
        }
        for (let i = middle; i < end; i++) {
            let noise = Math.floor(Math.random() * 3)
            try {
                for (let k = lastY + noise; k <= minHeight; k++) {
                    let block = {};
                    collisonMap[i * gridSize - gridSize][k * gridSize - gridSize] = true;
                    block["x"] = i * gridSize;
                    block["y"] = k * gridSize;
                    block["type"] = "dirt";
                    block["health"] = 100;
                    blocks.push(block);
                }
                lastY = lastY + noise
            } catch (e) {
                //map not generated for that part yet
            }
        }

    }
    return blocks;
}

function generateItem(x, y, name, type, damage,range, defence, health) {
    let item = {
        x: x,
        y: y,
        name: name,
        type: type,
        damage: damage,
        range: range,
        defence: defence,
        health: health
    };
    items.push(item);

}

function lowerHealth(player,amount) {
    player.health -= amount
    if(player.health <= 0){
        playerDead(player)
    }
}

function playerDead(player) {
    players.splice(players.indexOf(player),1)

}

function heal(player, amount) {
    if(player.health + amount > 100){
        player.health = 100;
    } else {
        player.health += amount
    }
}
function meleeAttack(player,item) {
    let range = item.range;
    for(let otherPlayer in players ){
        if(otherPlayer !== player){
            if(player.x -range <= otherPlayer.x && otherPlayer.x   <= player.x + range && player.y - range <= otherPlayer.y && otherPlayer.y   <= player.y + range ){
                lowerHealth(otherPlayer,item.damage);
                return true
            }
        }
    }
    return false;
}

function mineBlock(player,x,y,gridSize) {
    try {
        let gridx = x - x % gridSize
        let gridy = y - y % gridSize -(3 * gridSize );//fix later
        console.log(player.x +"," + player.y)
        console.log("attemting to destroy: " + x + " " + y)
        console.log("attemting to destroy: " + gridx + " " + gridy)
        if (collisonMap[gridx][gridy] !== undefined) {
            if (collisonMap[gridx][gridy] === true) {

                for (let block in map) {

                    if (map[block].x === gridx && map[block].y === gridy) {
                        map.splice(block, 1);
                        collisonMap[gridx-gridSize][gridy-32] =false;
                        console.log("deleting: " + gridx +","+ gridy)
                        console.log("destroyed");
                        return true;
                    }
                }

            }
        }
        return false;
    }catch (e) {
        return false;
    }
}

//64px 64px
function checkCollision(player, sizex, sizey, gridSize) {

    let xcoordinate = player.x + sizex;
    let ycoordinate = player.y - sizey;


    let MAXX = xcoordinate + sizex + (gridSize - ((xcoordinate + sizex) % gridSize));
    let MINX = xcoordinate - sizex - ((xcoordinate - sizex) % gridSize);
    let MAXY = ycoordinate + sizey + (gridSize - ((ycoordinate + sizey) % gridSize));
    let MINY = ycoordinate - sizey - ((ycoordinate - sizey) % gridSize);
    // console.log("Checking collision for = " + xcoordinate + "," + ycoordinate);
    // console.log(MAXX + "," + MINX);
    // console.log(MAXY + "," + MINY);

    for (let i = MINX; i <= MAXX; i += gridSize) {
        for (let j = MINY; j < MAXY; j += gridSize) {
            try {
                if (collisonMap[i][j] === undefined) {
                    //console.log("no collision")
                    return false;
                } else if(collisonMap[i][j]){
                    //console.log("collison with: " + i +","+ j)
                    return true;
                } else{
                    return false
                }
            } catch (e) {
                return false;
            }
        }
    }

}

function checkPlayerPerimeter(player, sizex, sizey, sizePerimeter) {


    let arrayLength = items.length;
    if(arrayLength > 0) {
        let xcoordinate = player.x + sizex;
        let ycoordinate = player.y - sizey;


        let MAXX = xcoordinate + sizePerimeter;
        let MINX = xcoordinate - sizePerimeter;
        let MAXY = ycoordinate + sizePerimeter;
        let MINY = ycoordinate - sizePerimeter;
        for (let i = 0; i < arrayLength; i++) {
            let item = items[i];
            if (item !== undefined) {
                if (item.x <= MAXX && item.x >= MINX && item.y < MAXY && item.y > MINY) {
                    let difx = xcoordinate - item.x;
                    let dify = ycoordinate - item.y;
                    if (difx <= 1 && difx >= -1 && dify <= 1 && dify >= -1) {
                        item.x = "Inventory";
                        item.y = "Inventory";
                        player.inventory.push(item)
                        items.splice(i, 1);
                        arrayLength = items.length;
                    } else {
                        if (difx > 0) {
                            item.x = item.x + 2
                        } else {
                            item.x = item.x - 2
                        }
                        if (dify > 0) {
                            item.y = item.y + 2
                        } else {
                            item.y = item.y - 2
                        }
                    }
                } else {
                    //gravity for the item
                    item.y += 3;
                    if (checkCollision(item, 32, 32, gridSize)) {
                        item.y -= 3;
                    }
                }
            }
        }
    }


}

function checkPlayerCloseToItems() {
    for (let player in players) {
        let currentPlayer = players[player];
        checkPlayerPerimeter(currentPlayer, 32, 32, 150);
    }
}

function gravity() {
    for (let player in players) {

        let currentPlayer = players[player];
        currentPlayer.y += 3;
        currentPlayer.onair = true;
        if (checkCollision(currentPlayer, 32, 32, gridSize)) {
            currentPlayer.y -= 3;
            currentPlayer.onair = false;
            // console.log("In land");
        }
    }

}

setInterval(function () {
    gravity();
    checkPlayerCloseToItems();
    io.sockets.emit('state', players);
    io.sockets.emit('items', items);
}, 1000 / 60);
