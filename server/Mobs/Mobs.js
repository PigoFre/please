const {move, jump} = require("./../collision");
const {meleeAttack} = require("./../Player/attack");
const {addItemInventory,deleteItemFromWorld} = require("./../Player/inventory");
const {generateItem} = require("./../Player/items");
module.exports = {
    generateMobs,
    generateMob,
    playerCloseToMob,
    mobController
}

async function MobAI(players, player, mobs, mob, collisionMap, attackRange, io,items,gridSize) {
    //go a bit right from the current then a bit left
    //check if a player is close if it is go to him
    //if he is close enough then attack not then follow him
    let moveSpeed = 8;
    if (player == null) {
        let number = Math.floor(Math.random() * 2);
        if (number == 0) {
            let times = 0;
            let interval = setInterval(function () {
                times++;
                move("left", mobs[mob], gridSize, collisionMap, moveSpeed);

                if (times > 5) {
                    mobs[mob].inThread = false;
                    clearInterval(interval);
                }
            }, 200);
            mobs[mob].inThread = true;
            return
        } else {
            let times = 0;
            let interval = setInterval(function () {
                times++;
                move("right", mobs[mob], gridSize, collisionMap, moveSpeed)
                if (times > 5) {
                    mobs[mob].inThread = false;
                    clearInterval(interval);
                }
            }, 200);
            mobs[mob].inThread = true;
            return
        }

    } else {

        if (player.x > mobs[mob].x) {
            let before = mobs[mob].x;
            move("right", mobs[mob], gridSize, collisionMap, moveSpeed)
            if (before == mobs[mob].x) {
                jump(mobs[mob], 50, collisionMap, gridSize, 4, 6);
                move("right", mobs[mob], gridSize, collisionMap, moveSpeed)
            }
        } else {
            let before = mobs[mob].x;
            move("left", mobs[mob], gridSize, collisionMap, moveSpeed)
            if (before == mobs[mob].x) {
                jump(mobs[mob], 50, collisionMap, gridSize, 4, 6);
                move("left", mobs[mob], gridSize, collisionMap, moveSpeed)
            }
        }
        let distance = calculateDistance(player.x + player.sizex, player.y + player.sizey, mobs[mob].x + mobs[mob].sizex, mobs[mob].y + mobs[mob].sizey)
        if (distance < attackRange) {
            if (player.x > mobs[mob].x) {
                mobs[mob].facing = "right"
            } else {
                mobs[mob].facing = "left"
            }
            mobs[mob].isAttacking = true;
            mobs[mob].progress = 0;

            let interval = setInterval(function () {
                mobs[mob].progress = mobs[mob].progress + 10;
                if (mobs[mob].progress > 100) {
                    clearInterval(interval)
                    if (mobs[mob].isDead == false) {
                        let peopleGothit = meleeAttack(players, mob, mobs[mob].holding[0], mobs, true,items)
                        io.sockets.emit('peoplegothit', peopleGothit);
                    }
                    mobs[mob].progress = 0;
                    mobs[mob].isAttacking = false;
                    setTimeout(function () {

                        mobs[mob].inThread = false;
                    }, 500)

                }
            }, 100);

            mobs[mob].inThread = true;
            return

        }

    }
    mobs[mob].inThread = false;
}

function generateMobs(startX, amount, mobs, collisionMap, gridSize, items) {
    let amountOfMobs = 0//Math.floor(Math.random() * Math.floor((amount / 10))) + 1;
    let density = 10
    let lastMob = startX + 5
    for (let i = 0; i < amountOfMobs; i++) {

        let start = lastMob + Math.floor(Math.random() * ((amount + startX - lastMob) / density));
        if (start >= startX + amount - 7) {
            break
        }
        lastMob = start + 5
        mobs = generateMob(start, collisionMap, gridSize, mobs, items);
    }

    return mobs;

}

function generateMob(start, collisionMap, gridSize, mobs, items) {
    let id = Math.floor(Math.random() * 100000000);
    id = "asd" + id + "asd";
    mobs[id] = {
        name: "Skeleton",
        x: start * gridSize,
        y: getHeight(start, collisionMap, gridSize, 640) - gridSize * 2,
        status: 0,
        health: 100,
        energy: 100,
        sizex: 32,
        sizey: 32,
        isDead: false,
        isMob: true,
        isAttacking: false,
        progress: 0,
        inThread: false,
        inventory: [],
        attacking: false,
        facing: "right",
        equipped: [],
        holding: []
    };
    let sword = generateItem(mobs[id].x, mobs[id].y, "sword_item", "melee", 25, 60, 0, 0, items, 1)
    mobs[id].holding.push(sword);
    deleteItemFromWorld(items,sword)
    let potion = generateItem(mobs[id].x, mobs[id].y, "healthpotion_item", "Consumable", 0, 0, 0, 1, items, 1)
    addItemInventory(mobs[id],potion,items)
    return mobs
}

function getHeight(x, collisionMap, gridSize, start) {
    if (collisionMap[x * gridSize] !== undefined) {
        let searched = Object.keys(collisionMap[x * gridSize]).length;
        let result = start - searched * gridSize
        return result
    }
}

function playerCloseToMob(players, mobs, range, collisionMap,io,items) {

    for (let mob in mobs) {
        let mobKey = mob
        mob = mobs[mob];
        let minRange = range + 1;
        let closestPlayer;
        for (let player in players) {
            player = players[player];
            let distance = calculateDistance(player.x + player.sizex, player.y + player.sizey, mob.x + mob.sizex, mob.y + mob.sizey)
            if (range >= distance) {
                if (minRange > distance) {
                    minRange = distance;
                    closestPlayer = player;
                }
            }
        }
        MobAI(players, closestPlayer, mobs, mobKey, collisionMap, 50,io,items)
    }
}

function calculateDistance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow((x1 - x2), 2) + Math.pow((y1 - y2), 2));
}

function getVisibleMobs(mobs) {
    //will be implemented
    return mobs
}

async function mobController(players, mobs, collisionMap, attackRange, range, io,items,gridSize) {
    setInterval(function () {
        {
            let visibleMobs = getVisibleMobs(mobs);

            for (let mob in visibleMobs) {
                let player = calculateClosestPlayer(players, mobs, mob, range)

                if (mobs[mob].inThread == false && mobs[mob].isDead == false) {
                    mobs[mob].inThread = true;
                    MobAI(players, player, mobs, mob, collisionMap, attackRange, io,items,gridSize);
                }
            }
        }
    }, 300);
}

function calculateClosestPlayer(players, mobs, mob, range) {
    let mobKey = mob
    mob = mobs[mob];
    let minRange = range + 1;
    let closestPlayer;
    for (let player in players) {
        player = players[player];
        if (player.health > 0) {
            let distance = calculateDistance(player.x + player.sizex, player.y + player.sizey, mob.x + mob.sizex, mob.y + mob.sizey)
            if (range >= distance) {
                if (minRange > distance) {
                    minRange = distance;
                    closestPlayer = player;
                }
            }
        }
    }
    return closestPlayer;
}
