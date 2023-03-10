let socket, cvs, cvsBackground,ctxBackground,ctxChat,cvsChat, ctx, leftMousePressed, rightMousePressed = undefined
let mousePosition = {}
let buttons = []
let displays = {}
let inInventory = false
let meter = new FPSMeter();
let perf = window.performance
let delayMouseClickEmit = perf.now()
let inChat = false
let inCrafting = false
let inChest = false
let sizeOfChar = 64
let messageHistory = []
let shouldUpdateUI = true
let showThisManyMessages = 9
let scrollChat = 0
let informationToPresent = {}
let craftingRecipes = []
let gameTime = {}
let popUps = {}
let popUpsIncrementer = 0
let popUpTimeDelay = 0

let currentChestOpen = {}

let healedPops = {}
let healedPopsIncrementer = 0
let healedPopsTimeDelay = 0



let keys = {}
let players = {}
let mobs = {}
let map;
let lightMap;
let items;
let projectiles;
let itemHoldingIndex = 0
let itemKeyThing = 0
let generalLightAmount = 0;

cvs = document.getElementById('canvas')
cvsBackground = document.getElementById('background')
ctxBackground = cvsBackground.getContext('2d')
cvsBackground.height = 32*22
cvsBackground.width = 32*42
cvsBackground.style['z-index'] = 0
cvsChat = document.getElementById('chat')
ctxChat = cvsChat.getContext('2d')
cvsChat.height = 32*22
cvsChat.width = 32*42
cvsChat.style['z-index'] = 2
ctx = cvs.getContext('2d')
cvs.width  = 32*42;
cvs.height = 32*22;
cvs.style['z-index'] = 1
cvs.style.border = 'solid black 1px'
let currentCoords = {x:cvs.width / 2,y:cvs.height/2 + 64}

var input = new CanvasInput({
  canvas: cvsChat,
  fontSize: 18,
  fontFamily: 'Arial',
  fontColor: '#212121',
  fontWeight: 'bold',
  width: 300,
  padding: 4,
  borderWidth: 1,
  borderColor: '#000',
  borderRadius: 5,
  boxShadow: '1px 1px 0px #fff',
  innerShadow: '0px 0px 5px rgba(0, 0, 0, 0.5)',
  placeHolder: 'Enter message here...',
  x:cvs.width - 311,
  y:cvs.height - 29
});

$('body').on('contextmenu', '#chat', function (e) {
  return false;
});

function updateUI(){
  ctxChat.clearRect(0, 0, cvs.width, cvs.height);
  ctxChat.fillStyle = 'black'
  ctxChat.font = '16px bold'
  ctxChat.drawImage(images['player_info_bg'], 100, 0, 250, 250/3.5)
  ctxChat.fillText(socket.id, 170, 22)
  ctxChat.fillText('Level: ' + players[socket.id].state.level, 175, 38)
  ctxChat.fillText('Gold: ' + 0, 171, 54)
  ctxChat.fillStyle = 'white'
  ctxChat.fillText('Time: '+gameTime.hour + ':' + gameTime.minute, cvs.width / 2, 32)
  input.render()
  displays['messagebox'].draw(ctxChat, inChat)
  displays['quickselect'].draw(ctxChat,cvs.width - 32,cvs.height - 500 ,players[socket.id].state.inventory)
  displays['healthbarframe'].draw(ctxChat, 0,cvs.height - 40, 100, 100)
  displays['energybarframe'].draw(ctxChat, 0,cvs.height - 20, 100, 100)
  displays['xpbarframe'].draw(ctxChat, 300,cvs.height - 20, 100, 100)

  displays['healthbar'].draw(ctxChat, 1,cvs.height - 40, players[socket.id].state.health, players[socket.id].state.maximumHealth)
  displays['energybar'].draw(ctxChat, 1,cvs.height - 20, players[socket.id].state.energy, players[socket.id].state.maximumEnergy)
  displays['xpbar'].draw(ctxChat, 301,cvs.height - 20,players[socket.id].state.xp, players[socket.id].state.xpToLevel)

  if(inCrafting){
    displays['crafting'].draw(ctxChat,0,0,craftingRecipes)
  }
  if(inChest){
    displays['chest'].draw(ctxChat,0,0)
  }
  if(inInventory){
    displays['inventory'].draw(ctxChat,0,0,players[socket.id].state.inventory)
    buttons['inventoryopen'].draw(ctxChat,0,0)
  }
  else{
    buttons['inventory'].draw(ctxChat,0,0)
  }
}

function drawPopUps(){
  popUpTimeDelay = perf.now()
  for(let popUp in popUps){
    if(popUps[popUp].xpLife < popUpTimeDelay){
      delete popUps[popUp]
    }
    else{
      if(popUps[popUp].isMob){
        if(popUps[popUp].damageLife > popUpTimeDelay){
          ctx.font = 'bold 20px Arial'
          ctx.fillStyle = 'white'
          ctx.fillText('-' + popUps[popUp].damage, mobs[popUps[popUp].attackedId].state.x, mobs[popUps[popUp].attackedId].state.y - popUps[popUp].ySpeed)
        }
        if(popUps[popUp].attackerId == socket.id && ![popUp].xpGained && popUps[popUp].xpLife > popUpTimeDelay){
          ctx.fillStyle = 'rgba(255,0,255,1)'
          ctx.fillText('XP ' + popUps[popUp].xpGained, players[popUps[popUp].attackerId].state.x, players[popUps[popUp].attackerId].state.y - popUps[popUp].ySpeed)
        }
      }
      else{
        if(popUps[popUp].attackedId == socket.id && popUps[popUp].damageLife > popUpTimeDelay){
        ctx.font = 'bold 20px Arial'
        ctx.fillStyle = 'white'
        ctx.fillText('-' + popUps[popUp].damage, players[popUps[popUp].attackedId].state.x, players[popUps[popUp].attackedId].state.y - popUps[popUp].ySpeed)
        }
        if(popUps[popUp].attackerId == socket.id && !popUps[popUp].xpGained && popUps[popUp].xpLife > popUpTimeDelay){
          ctx.fillStyle = 'rgba(255,0,255,1)'
          ctx.fillText('XP ' + popUps[popUp].xpGained, players[popUps[popUp].attackerId].state.x, players[popUps[popUp].attackerId].state.y - popUps[popUp].ySpeed)
        }
      }
      popUps[popUp].ySpeed++
    }
  }
}

function myGrid(x, y, gridSize) {
    let gridx = x - (x % gridSize)
    let gridy = y - (y % gridSize)

    if (gridx < 0) {
        gridx = gridx - gridSize
    }
    if (gridy < 0) {
        gridy = gridy - gridSize
    }

    if (x < 0 && (0 - gridSize) < x) {
        gridx = x - (x % gridSize) - gridSize
    }
    if (y < 0 && (0 - gridSize) < y) {
        gridy = y - (y % gridSize) - gridSize
    }
    let position = {
        x: gridx,
        y: gridy
    }
    return position
}

function drawHealedPops(){
  healedPopsTimeDelay = perf.now()
  for(let healedPop in healedPops){
    if(healedPops[healedPop].life <= healedPopsTimeDelay){
      delete healedPops[healedPop]
    }
    else{
      ctx.font = 'bold 20px Arial'
      ctx.fillStyle = 'rgba(0,255,0,1)'
      ctx.fillText('+' + healedPops[healedPop].heal, players[socket.id].state.x, players[socket.id].state.y - healedPops[healedPop].ySpeed)
      healedPops[healedPop].ySpeed ++
    }
  }
}

class Inventory{
  constructor(name,img,x,y,xOffset,yOffset,columnCount,rowCount,gridSize,actualSizeOffset,textOffsetX,textOffsetY){
    this.name = name
    this.img = img
    this.x = x
    this.y = y
    this.xOffset = xOffset
    this.yOffset = yOffset
    this.columnCount = columnCount
    this.rowCount = rowCount
    this.gridSize = gridSize
    this.currentRow = 0
    this.actualSizeOffset = actualSizeOffset
    this.textOffsetX = textOffsetX
    this.textOffsetY = textOffsetY
    this.xOfItem = 0
    this.yOfItem = 0
    this.xOfGrid = 0
    this.yOfGrid = 0
    this.infoOffset = 16
  }
  draw(ctx,ctX,ctY,inventory){
    this.currentRow = 0
    ctx.drawImage(this.img,this.x+ctX, this.y+ctY)
    for(let item in inventory){
      if(item % this.columnCount == 0 && item != 0){
        this.currentRow++
      }
      this.xOfGrid = (this.x+ctX)+((item%this.columnCount)*this.gridSize)+(this.xOffset*this.gridSize) + 1
      this.xOfItem = this.xOfGrid + this.actualSizeOffset/2

      this.yOfGrid = (this.y+ctY)+(this.yOffset*this.gridSize)+(this.currentRow*this.gridSize) + 1
      this.yOfItem = this.yOfGrid + (this.actualSizeOffset/2)

      if(mousePosition.x > this.xOfGrid && mousePosition.y > this.yOfGrid && mousePosition.x < this.xOfGrid + this.gridSize && mousePosition.y < this.yOfGrid + this.gridSize){
        if(leftMousePressed){
          ctx.fillStyle = 'rgba(255,0,0,0.5)'
          ctx.fillRect(this.xOfGrid, this.yOfGrid, 31, 31)
          informationToPresent = inventory[item]
        }
      }
      ctx.drawImage(images[inventory[item].name],this.xOfItem,this.yOfItem,this.gridSize - this.actualSizeOffset - 1,this.gridSize - this.actualSizeOffset - 1)
      ctx.font = '16px bold'
      ctx.fillStyle = 'white'
      ctx.fillText(inventory[item].amount, this.xOfItem + this.textOffsetX, this.yOfItem + this.textOffsetY)
    }
    for(let info in informationToPresent){
      ctx.fillText(info + ': ' + informationToPresent[info], this.x + 220, this.y + 40 + this.infoOffset)
      this.infoOffset+=16
    }
    this.infoOffset = 16
  }
}

class QuickSelect{
  constructor(name,img,x,y,xOffset,yOffset,columnCount,rowCount,gridSize,actualSizeOffset,textOffsetX,textOffsetY){
    this.name = name
    this.img = img
    this.x = x
    this.y = y
    this.xOffset = xOffset
    this.yOffset = yOffset
    this.columnCount = columnCount
    this.rowCount = rowCount
    this.gridSize = gridSize
    this.currentRow = 0
    this.actualSizeOffset = actualSizeOffset
    this.textOffsetX = textOffsetX
    this.textOffsetY = textOffsetY
    this.itemCurrent = 0
    this.xOfItem = 0
    this.yOfItem = 0
    this.currentTime = Date.now()
  }
  draw(ctx,ctX,ctY,inventory){
    this.currentTime = Date.now()
    ctx.drawImage(this.img,this.x+ctX, this.y+ctY)
    for(this.currentRow = 0; this.currentRow < 9; this.currentRow++){
      this.itemCurrent = inventory[this.currentRow]
      this.xOfItem = (this.x+ctX)+((this.currentRow%this.columnCount)*this.gridSize)+(this.xOffset*this.gridSize) + (this.actualSizeOffset/2)
      this.yOfItem = (this.y+ctY)+(this.yOffset*this.gridSize)+(this.currentRow*this.gridSize)+ (this.actualSizeOffset/2)
      if(this.itemCurrent){
        ctx.drawImage(images[inventory[this.currentRow].name],this.xOfItem,this.yOfItem,this.gridSize - this.actualSizeOffset,this.gridSize - this.actualSizeOffset)
        ctx.font = '16px Arial'
        ctx.fillStyle = 'white'
        ctx.fillText(inventory[this.currentRow].amount, this.xOfItem + this.textOffsetX, this.yOfItem + this.textOffsetY)
        if(this.itemCurrent.name == 'healthpotion_item'){
          this.currentTime = players[socket.id].state.healingDelay - this.currentTime
          this.currentTime = ((this.currentTime % 60000) / 1000).toFixed(0)
          if(this.currentTime <= 0){
            this.currentTime = ''
          }
          ctx.font = '20px Arial'
          ctx.fillStyle = 'red'
          ctx.fillText(this.currentTime, this.xOfItem + this.textOffsetX - 30, this.yOfItem + this.textOffsetY)
        }
      }
      if(this.currentRow == itemHoldingIndex){
        ctx.fillStyle = 'rgba(250,0,0,0.2)'
        ctx.fillRect(this.xOfItem - 5, this.yOfItem - 5, this.gridSize, this.gridSize)
      }
    }
  }
}

class UIButton {
  constructor(name,x,y,img,width,height){
    this.name = name
    this.x = x
    this.y = y
    this.img = img
    this.width = width
    this.height = height
  }
  isHovered(){
    if(mousePosition.x >= this.x && mousePosition.x <= this.x + this.width && mousePosition.y >= this.y && mousePosition.y <= this.y + this.height){
      return true
    }
  }
  isClicked(){
    if(this.isHovered()){
      inInventory = !inInventory
      leftMousePressed = false
      rightMousePressed = false
      informationToPresent = {}
    }
    return true
  }
  draw(ctx,ctX,ctY){
    ctx.drawImage(this.img, this.x+ctX, this.y+ctY, this.width, this.height)
  }
}

class CraftingButton {
  constructor(name,x,y,img,width,height){
    this.name = name
    this.x = x
    this.y = y
    this.img = img
    this.width = width
    this.height = height
  }
  isHovered(){
    if(mousePosition.x >= this.x && mousePosition.x <= this.x + this.width && mousePosition.y >= this.y && mousePosition.y <= this.y + this.height){
      return true
    }
  }
  isClicked(){
    if(this.isHovered()){
      if(informationToPresent.name){
        socket.emit('craft', informationToPresent)
      }
    }
    return true
  }
  draw(ctx,ctX,ctY){
    ctx.drawImage(this.img, this.x,this.y, this.width, this.height)
  }
}

class BarFrame {
  constructor(name, x, y,img, width, height){
    this.name = name
    this.x = x
    this.y = y
    this.img = img
    this.width = width || img.width
    this.height = height || img.height
  }
  draw(ctx,ctX,ctY,value,max){
    ctx.drawImage(this.img, this.x+ctX, this.y+ctY, (value / max) * this.width, this.height)
  }
}

class Bar {
  constructor(name, x, y,img, width, height){
    this.name = name
    this.x = x
    this.y = y
    this.img = img
    this.width = width || img.width
    this.height = height || img.height
  }
  draw(ctx,ctX,ctY,value,max){
    ctx.drawImage(this.img, this.x+ctX, this.y+ctY, (value / max) * this.width, this.height)
    ctx.font = 'bold 14px Arial'
    ctx.fillStyle = 'white'
    ctx.fillText(value + '/' + max, this.x+ctX + this.width / 2 - 30, this.y+ctY+12)
  }
}

class Camera {
  constructor(x, y, ppX, ppY, speed){
    this.x = x;
    this.y = y;
    this.ppX = ppX;
    this.ppY = ppY;
    this.speed = speed;
  }

  move(x,y){
    camera.x+=x
    camera.y+=y
    ctx.translate(-x, -y)
  }

  set(x,y){
    this.x = x
    this.y = y
  }
}

class MessageBox {
  constructor(x, y, width, height){
    this.x = x
    this.y = y
    this.width = width
    this.height = height
    this.offset = 16
  }

  draw(ctx, truness){
    if(truness){
      ctx.fillStyle = 'rgba(255,255,255,1)'
      ctx.fillRect(this.x, this.y, this.width, this.height)
      ctx.fillStyle = 'rgba(0,0,0,1)'
    }
    else{
      ctx.fillStyle = 'rgba(255,255,255,0.2)'
      ctx.fillRect(this.x, this.y, this.width, this.height)
      ctx.fillStyle = 'rgba(0,0,0,0.2)'
    }
    if(messageHistory.length <= showThisManyMessages){
      for(let message in messageHistory){
        if(messageHistory[message].sender == socket.id){
          ctx.fillText('you:' + messageHistory[message].message, this.x + 2, this.y + this.offset)
        }
        else{
          ctx.fillText(messageHistory[message].sender + ':' + messageHistory[message].message, this.x + 2, this.y + this.offset)
        }
        this.offset+=16
      }
    }
    else{
      for(let message = messageHistory.length - showThisManyMessages - scrollChat;message < messageHistory.length - scrollChat;message++){
        if(messageHistory[message].sender == socket.id){
          ctx.fillText('you:' + messageHistory[message].message, this.x + 2, this.y + this.offset)
        }
        else{
          ctx.fillText(messageHistory[message].sender + ':' + messageHistory[message].message, this.x + 2, this.y + this.offset)
        }
        this.offset+=16
      }
    }

    this.offset = 16
  }
}

class Crafting {

  constructor(name,img,x,y,xOffset,yOffset,columnCount,rowCount,gridSize,actualSizeOffset,craftingButtonImage){
    this.name = name
    this.img = img
    this.x = x
    this.y = y
    this.xOffset = xOffset
    this.yOffset = yOffset
    this.columnCount = columnCount
    this.rowCount = rowCount
    this.gridSize = gridSize
    this.currentRow = 0
    this.actualSizeOffset = actualSizeOffset

    this.xOfItem = 0
    this.yOfItem = 0
    this.xOfGrid = 0
    this.yOfGrid = 0
    this.infoOffset = 0
    this.havingAmount = 0
    this.craftingButton = new CraftingButton('craft', x + img.width - 32 - 5, y + img.height-32 - 5 ,craftingButtonImage,32,32)
  }
  draw(ctx,ctX,ctY,inventory){

    this.currentRow = 0
    ctx.drawImage(this.img,this.x+ctX, this.y+ctY)
    this.craftingButton.draw(ctx, 0, 0)
    for(let item in craftingRecipes){
      if(item % this.columnCount == 0 && item != 0){
        this.currentRow++
      }
      this.xOfGrid = (this.x+ctX)+((item%this.columnCount)*this.gridSize)+(this.xOffset*this.gridSize) + 1
      this.xOfItem = this.xOfGrid + this.actualSizeOffset/2
      this.yOfGrid = (this.y+ctY)+(this.yOffset*this.gridSize)+(this.currentRow*this.gridSize) + 1
      this.yOfItem = this.yOfGrid + (this.actualSizeOffset/2)
      if(mousePosition.x > this.xOfGrid && mousePosition.y > this.yOfGrid && mousePosition.x < this.xOfGrid + this.gridSize && mousePosition.y < this.yOfGrid + this.gridSize){
        if(leftMousePressed){
          ctx.fillStyle = 'rgba(255,0,0,0.5)'
          ctx.fillRect(this.xOfGrid, this.yOfGrid, 31, 31)
          informationToPresent = craftingRecipes[item]
        }
      }
      ctx.drawImage(images[inventory[item].name],this.xOfItem,this.yOfItem,this.gridSize - this.actualSizeOffset - 1,this.gridSize - this.actualSizeOffset - 1)
    }
    ctx.fillStyle = 'white'
    ctx.font = "16px Arial"
    for(let recipe in informationToPresent['recipe']){
      for(let item in players[socket.id].state.inventory){
        if(players[socket.id].state.inventory[item].name == recipe){
          this.havingAmount = players[socket.id].state.inventory[item].amount
          break
        }
        this.havingAmount = 0
      }
      ctx.fillText(recipe + ': ' + this.havingAmount + ' / ' + informationToPresent['recipe'][recipe], this.x + 5, this.y + 130 + this.infoOffset)
      this.infoOffset+=16
    }
    this.infoOffset = 16
  }
}

class Chest {

  constructor(name,img,x,y,xOffset,yOffset,columnCount,rowCount,gridSize,actualSizeOffset){
    this.name = name
    this.img = img
    this.x = x
    this.y = y
    this.xOffset = xOffset
    this.yOffset = yOffset
    this.columnCount = columnCount
    this.rowCount = rowCount
    this.gridSize = gridSize
    this.currentRow = 0
    this.actualSizeOffset = actualSizeOffset

    this.xOfItem = 0
    this.yOfItem = 0
    this.xOfGrid = 0
    this.yOfGrid = 0
    this.infoOffset = 0
    this.havingAmount = 0
  }
  draw(ctx,ctX,ctY){
    this.currentRow = 0
    ctx.drawImage(this.img,this.x+ctX, this.y+ctY)
    let grid = myGrid(mousePosition.x, mousePosition.y, 32)
    if(leftMousePressed){
      ctx.fillRect(grid.x + 1, grid.y + 1, 31, 31)
    }
    for(let item in currentChestOpen.items){
      if(item % this.columnCount == 0 && item != 0){
        this.currentRow++
      }
      this.xOfGrid = (this.x+ctX)+((item%this.columnCount)*this.gridSize)+(this.xOffset*this.gridSize) + 1
      this.xOfItem = this.xOfGrid + this.actualSizeOffset/2
      this.yOfGrid = (this.y+ctY)+(this.yOffset*this.gridSize)+(this.currentRow*this.gridSize) + 1
      this.yOfItem = this.yOfGrid + (this.actualSizeOffset/2)
      ctx.drawImage(currentChestOpen.items[item].name,this.xOfItem,this.yOfItem,this.gridSize - this.actualSizeOffset - 1,this.gridSize - this.actualSizeOffset - 1)
    }
    ctx.fillStyle = 'white'
    ctx.font = "16px Arial"
  }
}

let camera = new Camera(0, 0, 0, 0, 5);
let images = {}
let promises = []
let img = null
function loadImagesThen(folders){
  for(let folder in folders){
    for(let image in folders[folder]){
      promises.push(new Promise((resolve, reject) => {
        img = new Image();
        img.onload = function() {
          resolve('resolved')
        }
        img.src = './images/' + folder + '/' + folders[folder][image];
        images[folders[folder][image].split('.png')[0]] = img
      }))
    }
  }
  Promise.all(promises).then(() => {
    console.log('Finished loading images');
    buttons['inventory'] = new UIButton('Inventory', 0, 0, images['inventory'], 32, 32)
    buttons['inventoryopen'] = new UIButton('Inventoryopen', 0, 0, images['inventoryopen'], 32, 32)
    displays['inventory'] = new Inventory('Inventory',images['inventory_UI'], 80, 50, 1, 9, 13, 5, 32, 16,14,29)
    displays['quickselect'] = new QuickSelect('Quickselect', images['quickselect_UI'], 0,0,0,0,1,9,32,12,2,17)

    displays['healthbarframe'] = new BarFrame('barframe', 0, 0, images['health_bg_upscaled'], 200, 200/12.75)
    displays['energybarframe'] = new BarFrame('barframe', 0, 0, images['health_bg_upscaled'], 200, 200/12.75)
    displays['xpbarframe'] = new BarFrame('barframe', 0, 0, images['health_bg_upscaled'], 600, 200/12.75)

    displays['healthbar'] = new Bar('healthbar', 0, 0, images['health_fg_upscaled'], 196, 180/12.75)
    displays['energybar'] = new Bar('energybar', 0, 0, images['energy_fg_upscaled'], 196, 180/12.75)
    displays['xpbar'] = new Bar('xpbar', 0, 0, images['xp_fg_upscaled'], 595, 200/12.75)
    displays['chest'] = new Chest('chest', images['chest_UI'], 32*18, 32*6, 0, 3, 10, 3, 32, 32)

    displays['messagebox'] = new MessageBox(cvs.width - 311, cvs.height - 29 - 150 - 10, 308, 150)
    displays['crafting'] = new Crafting('Crafting',images['craft_UI'], cvs.width / 2 - 240, 200, 0, 2, 13, 2, 32, 12, images['craftbutton_UI'])
    socket.emit('new player')
    socket.emit('map',)
    ctxBackground.drawImage(images['background01'], 0, 0, cvs.width, cvs.height)
    window.requestAnimationFrame(game)
  });
}

function animatePlayers(playersServer) {
  for (let player in playersServer) {
    if (playersServer[player] != 0) {
      if (!players[player]) {
        console.log('New Player joined');
        players[player] = new Player(playersServer[player])
        players[player].addAnimation('idleR', images['dwarf1'], 0, 4, 0, 32, 32, sizeOfChar, sizeOfChar, 100)
        players[player].addAnimation('idleL', images['dwarf1'], 0, 4, 5, 32, 32, sizeOfChar, sizeOfChar, 100)
        players[player].addAnimation('up', images['dwarf1'], 0, 7, 1, 32, 32, sizeOfChar, sizeOfChar, 100)
        players[player].addAnimation('runL', images['dwarf1'], 0, 7, 6, 32, 32, sizeOfChar, sizeOfChar, 100)
        players[player].addAnimation('down', images['dwarf1'], 0, 7, 6, 32, 32, sizeOfChar, sizeOfChar, 100)
        players[player].addAnimation('runR', images['dwarf1'], 0, 7, 1, 32, 32, sizeOfChar, sizeOfChar, 100)
        players[player].addAnimationOnce('attackR', images['dwarf1'], 0, 6, 2, 32, 32, sizeOfChar, sizeOfChar, 50)
        players[player].addAnimationOnce('attackL', images['dwarf1'], 0, 6, 7, 32, 32, sizeOfChar, sizeOfChar, 50)
        players[player].addAnimationOnce('gothitR', images['dwarf1'], 0, 3, 3, 32, 32, sizeOfChar, sizeOfChar, 100)
        players[player].addAnimationOnce('gothitL', images['dwarf1'], 0, 3, 8, 32, 32, sizeOfChar, sizeOfChar, 100)
        players[player].addAnimationFinal('dieR', images['dwarf1'], 0, 6, 4, 32, 32, sizeOfChar, sizeOfChar, 50)
      } else {
        if (players[player].state.status != playersServer[player].status) {
          players[player].resetAnimations()
        }
        players[player].state = playersServer[player]
      }
    } else if (players[player]) {
      delete players[player]
    }
  }
}

document.body.onload = () => {

  socket = io.connect('http://localhost:5000')

  socket.on('connect', () => {
    socket.on('state', (playersServer) => {
        animatePlayers(playersServer);
        socket.emit('state',);
    });

    // socket.on('map', (mapServer) => {
    //   map = mapServer.map
    //   lightMap = mapServer.lightMap
    //   socket.emit('map',)
    // });
    //
    // socket.on('items', (itemsServer) => {
    //   items = itemsServer
    //   socket.emit('items',)
    // });

    // socket.on('generalLight', (generalLightAmountServer) => {
    //   generalLightAmount = generalLightAmountServer
    //   socket.emit('generalLight',)
    // });
    socket.on('generalmessage', (message) => {
      messageHistory.push(message)
      shouldUpdateUI = true
    });
    socket.on('gameData', (gameData) => {
      map = gameData.map
      lightMap = gameData.lightMap
      items = gameData.items
      generalLightAmount = gameData.generalLight
      gameTime = gameData.gameTime
      let playersServer = gameData.state
      projectiles = gameData.projectiles
      animatePlayers(playersServer);
      socket.emit('gameData',)
    });
    // socket.on('projectiles', (projectilesServer) => {
    //   projectiles = projectilesServer
    // });

    socket.on('mobs', (mobsServer) => {
      for(let mob in mobsServer){
        if(mobsServer[mob] != 0){
          if (!mobs[mob]){
            console.log('New Mob Generated');
            mobs[mob] = new Mob(mobsServer[mob])
            mobs[mob].addAnimation('idleL',images['Skeleton_Idle_left'],0,10,0,24,32,64,64,100)
            mobs[mob].addAnimation('idleR',images['Skeleton_Idle'],0,10,0,24,32,64,64,100)
            mobs[mob].addAnimation('walkL',images['Skeleton_Walk_left'],0,12,0,22,33,64,64,100)
            mobs[mob].addAnimation('walkR',images['Skeleton_Walk'],0,12,0,22,33,64,64,100)
            mobs[mob].addAnimationOnce('attackL',images['Skeleton_Attack_left'],0,17,0,43,37,64,64,100)
            mobs[mob].addAnimationOnce('attackR',images['Skeleton_Attack'],0,17,0,43,37,64,64,100)
            mobs[mob].addAnimationFinal('dead',images['Skeleton_Dead'],0,14,0,33,32,64,64,100)
            mobs[mob].addAnimationOnce('gothit',images['Skeleton_Hit'],0,7,0,30,32,64,64,100)
          }
          else{
            if(mobs[mob].state.status != mobsServer[mob].status){
              mobs[mob].resetAnimations()
            }
            mobs[mob].state = mobsServer[mob]
          }
        }
        else if(mobs[mob]){
          delete mobs[mob]
        }
      }
      socket.emit('mobs',)
    });
    socket.on('peoplegothit', (entities) => {
      for(let entity in entities.mobs){
        popUpsIncrementer++
        popUps[popUpsIncrementer] = entities.mobs[entity]
        popUps[popUpsIncrementer].ySpeed = -10
        popUps[popUpsIncrementer].damageLife = 500 + perf.now()
        if(popUps[popUpsIncrementer].xpGained){
          popUps[popUpsIncrementer].ySpeed = -32
          popUps[popUpsIncrementer].xpLife = 1000 + perf.now()
        }
        mobs[entities.mobs[entity].attackedId].isHit = true
      }
      for(let entity in entities.players){
        if(entities.players[entity].attackedId == socket.id){
          shouldUpdateUI = true
        }
        popUpsIncrementer++
        popUps[popUpsIncrementer] = entities.players[entity]
        popUps[popUpsIncrementer].ySpeed = -10
        popUps[popUpsIncrementer].damageLife = 500 + perf.now()
        if(popUps[popUpsIncrementer].xpGained){
          popUps[popUpsIncrementer].ySpeed = -32
          popUps[popUpsIncrementer].xpLife = 1000 + perf.now()
        }
        players[entities.players[entity].attackedId].isHit = true
      }
    });
    socket.on('gothealed', (healed) => {
      healedPopsIncrementer++
      healedPops[healedPopsIncrementer] = {heal:healed, life:perf.now() + 500, ySpeed:-32}
      shouldUpdateUI = true
    });

    socket.on('images', (folders) => {
      loadImagesThen(folders)
    });

    // socket.on('gametime', (gameTimeServer) => {
    //   gameTime = gameTimeServer
    //   socket.emit('gametime',)
    // });

    socket.on('craftingui', (craftingRecipesServer) => {
      inCrafting = true
      craftingRecipes = craftingRecipesServer
      shouldUpdateUI = true
    });

    socket.on('chestgui', (chest) => {
      currentChestOpen = chest
      inChest = true
      inInventory = true
      shouldUpdateUI = true
    });


    document.onkeydown = (key) => {
        if(key.key != "w" || key.key != "a" || key.key != "s" || key.key != "d"){
          shouldUpdateUI = true
        }
        if(key.key == 'Escape'){
          inInventory = false
          inChat = false
          inCrafting = false
          inChest = false
          informationToPresent = {}
          input.blur()
          return
        }
        if(key.key == 'Enter'){
          if(input.value().trim() != ''){
            socket.emit('generalmessage', {message:input.value()})
            input.value("")
          }
        }
        if(!inChat){
          if(key.key == 'i'){
            inInventory = !inInventory
            return
          }
          if(!inInventory){
            keys[key.key] = true
          }
           itemKeyThing = key.key-1
          if(!isNaN(itemKeyThing) && key.key != ' '){
            itemHoldingIndex = itemKeyThing
            players[socket.id].state.holding = [players[socket.id].state.inventory[itemKeyThing]]
            socket.emit('holding', players[socket.id].state)
          }
        }
    }

    document.onkeyup = (key) => {
      keys[key.key] = false
    }

    cvsChat.addEventListener('mousedown', function(evt) {
      if(input._wasOver){
        inChat = true
      }
      else{
        inChat = false
      }
      shouldUpdateUI = true
      if(evt.button == 0){
        leftMousePressed = true
        buttons['inventory'].isClicked()
        if(inCrafting){
          displays['crafting'].craftingButton.isClicked()
        }
      }
      else{
        rightMousePressed = true
      }
    });

    cvsChat.addEventListener('mouseup', function(evt) {
        if(evt.button == 0){
          leftMousePressed = false
        }
        else{
          rightMousePressed = false
        }
    });

    cvsChat.addEventListener('mousemove', function(event) {
     mousePosition.x = event.offsetX || event.layerX;
     mousePosition.y = event.offsetY || event.layerY;
    });

    cvsChat.addEventListener('wheel', function(event) {
      if(!inChat){
        if(event.deltaY > 0){
          itemHoldingIndex++
          if(itemHoldingIndex > 8){
            itemHoldingIndex = 0
          }
        }
        else{
          itemHoldingIndex--
          if(itemHoldingIndex < 0){
            itemHoldingIndex = 8
          }
        }
        players[socket.id].state.holding = [players[socket.id].state.inventory[itemHoldingIndex]]
        socket.emit('holding', players[socket.id].state)
        console.log('sent');
      }
      else{
        if(event.deltaY > 0){
          if(scrollChat > 0){
            scrollChat--
          }
        }
        else{
          if(messageHistory.length - showThisManyMessages - scrollChat > 0){
            scrollChat++
          }
        }
      }
      shouldUpdateUI= true
    });

    socket.emit('getimages')
  });

}
