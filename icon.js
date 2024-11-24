// Simple ICON designer using p5.js 
// Johnny Wilson, Sussex 2023
// Note: x / y >> 0 is equivalent to Math.floor(x/y)
const CLEAR_KEY = ' ';
const TOGGLE_KEY = ' ';

const gLevel = 240 ;
const designGridLen = 16 ;
const bmapGridLen = 8 ;

const xDesign = 100 ;
const yDesign = 100 ;
const iconWidth = 32 ;
const iconHeight = 32 ;

const xBitmap = xDesign + (iconWidth + 4) * designGridLen;
const yBitmap = 100 ;

const sectionRectRadius = 2 ;
const sectionEdgeWeight = 2 ;
const numberOfCells = iconWidth * iconHeight;

let font;
let redColour ;
let whiteColour  ;
let greyColour  ;
let altcursorColour ;
let cursorColour;
let blockedColour ;
let blackColour ;

let hotspotManager ;

let xEdit, yEdit ;

let moves,undo ;
//let iconMask = 0n ;         // BigInt mask of 32x32 grids which are part of our design. 
                            // Bit is set for those particular cells which are part of our design using an 32*32 bit bitmask. 
let iconMask = 22611426676810416377376527505821899013899082942494683051415482733082940441301515864637509277826116799329225565412343959595681004165736266346727014769222897149451174055183280681859454633197562599880464751891742885805626663905312667591773385989710569630723599656178332178890572898264449053763028926303567872n



let canvas ;
let btn ;
let byteArrayElement ;
let preloaded_data = {}; // Global object to hold results from the loadJSON call

class Move {
  
  constructor(cell, val) {
     this.value = val ;
     this.cell = cell ;
  }
  
  getCell() { return this.cell ; }
  
  getValue() { return this.value ; }
  
  isEqual(move) { return ((this.cell === move.getCell()) && (this.value === move.getValue())) ; }
  
  debug() { 
//    console.log("Move : cell =  " + this.cell + " value = " + this.value ) ;
  }
  
}


class Stack {
  
  constructor() {
    this.data = [] ;
    this.top = 0 ;
  }
  
  size() {
    return this.top   ;    
  }
  
  push(element) { 
    this.data[this.top++] = element ;
  } 
  
  isEmpty() {
    return (this.top === 0) ;  
  }
  
  pop() { 
    if (!this.isEmpty()) {
       return this.data[--this.top] ;
    }
    
  }
  
  isEqual(move) {
    return (!this.isEmpty() &&  this.peek().isEqual(move)) ; 
  }
  
  peek() {
    if (!this.isEmpty()) {
      return this.data[this.top - 1] ;
    }
  }
  
  debug() {
    let top = this.top ;
    while (--top >= 0) {
      this.data[top].debug() ;      
    }
  }

}





function preload() {
    font = loadFont('https://raw.githubusercontent.com/google/fonts/master/ofl/alikeangular/AlikeAngular-Regular.ttf');
 // font = loadFont('https://raw.githubusercontent.com/google/fonts/master/ofl/arizonia/Arizonia-Regular.ttf') ;
    

 // Define Colour 'constants'

 redColour = color(255, 0, 0);
 whiteColour = color(255, 255, 255);
 greyColour  = color(gLevel, gLevel, gLevel) ;

 blockedColour = color(255, 255, 0);        
 cursorColour = color(255, 0, 0);     // Default Cursor Colour    
 altcursorColour = color(255, 255, 0);     // Default Cursor Colour    

 answerColour = color(100, 100, 100);
 blackColour = color(0, 0, 0);


}

function save_data() {
    window.localStorage.setItem('icon_design', iconMask.toString());
}

function load_data() {
    return BigInt(window.localStorage.getItem('icon_design') || 0n) ;
}

function setup() {
  

  // Sets the screen to be 1200 pixels wide and 800 pixels high
  canvas = createCanvas(1200, 640).class('mycnv');

  //btn = createButton("COPY DESIGN");
  //btn.mousePressed( function () { printLogElement("button pressed") ; }) ;

  instructions = [
   "Instructions",
   "Use cursor keys and/or mouse to select bits you wish to edit",
   "Space Bar to toggle the selected bit.",
   "ByteArray is updated after each change. Designs are saved in localStorage"
  ];

  instructions.forEach((ins) => createElement("p", ins))

  maskElement = createElement("p", 'Mask Element').class('maskdata');

  byteArrayElement = createElement("p", 'Paragraph Element').class('bitdata');

  createElement("p", "Copy bytearray line above and paste in your Python code.")
  
  background(whiteColour);
  noSmooth();
  
  
  moves = new Stack() ;
  redo = new Stack() ;
  iconMask = load_data() ; // Load any data in localStorage
  
}


function draw() {
  
    drawDesignBox(xDesign, yDesign, designGridLen);
    drawCurrentDesign()
    drawSectionEdges(xDesign, yDesign, designGridLen)
    drawCurrentEditCell(xEdit, yEdit);
    byteArrayElement.html(`design=bytearray([${iconMaskToByteArray(iconMask)}])`)
    maskElement.html(`${iconMask}`)

}

// Binary reverse an 8-bit number
// bit0 <-> bit7
// bit1 <-> bit6
// bit2 <-> bit5
// bit3 <-> bit4

function reverseBits( num)
{ 
    //  
    return ((num & 1) << 7) |
        ((num & 2) << 5) |
        ((num & 4) << 3) |
        ((num & 8) << 1) |
        ((num & 128) >> 7) |
        ((num & 64) >> 5) |
        ((num & 32) >> 3) |
        ((num & 16) >> 1);

}

function byteformat(strn) {
    return strn.length == 1 ? "0" + strn : strn;
}

function iconMaskToByteArray(mask) {
    let byteArray = [];

    for (let y = 0; y < iconHeight; y++) {
        for (let x = 0; x < (iconWidth / 8)>>0; x++) {
            let _8bits = Number((mask & 255n));
            byteArray.push("0x" + byteformat(reverseBits(_8bits).toString(16)));
            mask >>= 8n;
        }
    }
    return byteArray;
}


function printLogElement(str) {
   let p = createElement("p",str).class('log') ;
}

function resetIconDesign() {
  clearAllCells() ;
}

function clearAllCells() {
    iconMask = 0n
}





function isPowerOf2(n) {
  return (n != 0 && (n & (n-1)) == 0) ;
}



function drawDesignBox(xStart,yStart,gridLen) {
  

    // Draw each of the  boxes using default colours

    for (let gridNumber = 0; gridNumber < numberOfCells; gridNumber++) {

        let ry = (gridNumber / iconWidth) >> 0;
        let rx = (gridNumber % iconWidth);

        let boxColour = (rx & 1) ^ (ry & 1) ? greyColour : whiteColour;
        drawSubSections(xStart + rx * gridLen, yStart + ry * gridLen, gridLen, boxColour);

    }


}

function drawSectionEdges(xStart, yStart, gridLen) {

    // Draw edges to highlite each of the 16 sections 

    stroke(0);
    strokeWeight(sectionEdgeWeight);
    noFill();
    for (let section = 0; section < 16; section++) {
        let ry = (section / 4) >> 0;
        let rx = (section % 4);
        rect(xStart + rx * gridLen * 8, yStart + ry * gridLen * 8, gridLen * 8, gridLen * 8, sectionRectRadius);
    }

}   

function drawSubSections(xSection, ySection, boxLen, boxColour)
{
  
  let boxOutlineColour = color(0,0,0) ;
  
  stroke(boxOutlineColour);
  strokeWeight(1);
  fill(boxColour) ;
  rect(xSection, ySection, boxLen, boxLen) ;
  
  
}






function mousePressed() {

}

function drawCell(cell, isEmpty) {
    xCell = cell % iconWidth;
    yCell = (cell / iconWidth) >> 0;

    fill(isEmpty ? whiteColour : blackColour);
    stroke(0)
    strokeWeight(0)
    rect(xBitmap + xCell * bmapGridLen, yBitmap + yCell * bmapGridLen, bmapGridLen, bmapGridLen);

    let designColour = isEmpty ? ((xCell & 1) ^ (yCell & 1) ? greyColour : whiteColour) : redColour;

    fill(designColour);
    stroke(0);
    strokeWeight(1);
    rect(xDesign + xCell * designGridLen, yDesign + yCell * designGridLen, designGridLen, designGridLen);


}
function drawCurrentEditCell(xCell, yCell) {


  if ((typeof xCell != 'undefined')) {
     
      let cell = xCell + iconWidth * yCell
     fill(cursorColour);
     stroke(0);
     strokeWeight(1) ;
     rect(xBitmap + xCell * bmapGridLen, yBitmap + yCell * bmapGridLen, bmapGridLen, bmapGridLen) ;

      let hColour = isEditable(cell) ? isEmpty(cell) ? cursorColour : altcursorColour : blockedColour;

     noFill() ;
     stroke(hColour) ;
     strokeWeight(2) ;
     rect(xDesign + xCell * designGridLen, yDesign + yCell * designGridLen, designGridLen, designGridLen,4) ;

  }
  
}

function mouseReleased() {
  mouseEvent() ;
}


function mouseEvent() {

    if (mouseX > xBitmap && mouseX < xBitmap + iconWidth * bmapGridLen) {
        if (mouseY > yBitmap && mouseY < yBitmap + iconWidth * bmapGridLen) {
            xEdit = ((mouseX - xBitmap) / bmapGridLen) >> 0 ;
            yEdit = ((mouseY - yBitmap) / bmapGridLen) >> 0 ;
      }
    } else
        if (mouseX > xDesign && mouseX < xDesign + iconWidth * designGridLen) {
            if (mouseY > yDesign && mouseY < yDesign + iconWidth * designGridLen) {
                xEdit = ((mouseX - xDesign) / designGridLen) >> 0 ;
                yEdit = ((mouseY - yDesign) / designGridLen) >> 0 ;
      }
    }
}


function mouseMoved() {
}

function  isEditable(cell) {
    return true;
}

// Check icon Mask to see if this particular cell is 'editable'. i.e it is not part of the puzzle.
function isEmpty(cell) {
    return isNotSet(cell);
}
function isNotSet(cell) {
  return (iconMask & (1n << BigInt(cell) )) === 0n ;
}

function toggleCell(cell) {
    iconMask ^= (1n << BigInt(cell))
}
function setCell(cell) {
    iconMask |= (1n << BigInt(cell))
}

function clearCell(cell) {
    iconMask &= ~(1n << BigInt(cell))
}

function drawCurrentDesign() {

    mask = iconMask

    for (let cell = 0; cell < numberOfCells; cell++) {
        if ((mask & 1n) == 0n) {
            drawCell(cell, true)
        } else {
            drawCell(cell, false)
        }
        mask >>= 1n
    }
}


function undoMove() {
  
  if (!moves.isEmpty()) {
      let move = moves.pop() ;
      let gridNumber = move.getCell() ;
      let digit = move.getValue() ;
      redo.push(move) ;
      //solution[gridNumber] = digit ;
      //clearDownMasks() ;
    } 
   
  
}

function keyPressed() {

  // Edit Keys
  
  if (typeof xEdit != 'undefined') {
    
      if (keyCode === LEFT_ARROW) {
          xEdit = (xEdit == 0) ? (iconWidth - 1) : --xEdit;
      } else if (keyCode === RIGHT_ARROW) {
          xEdit = (xEdit + 1) % iconWidth;
      } else if (keyCode === DOWN_ARROW) {
          yEdit = (yEdit + 1) % iconHeight;
      } else if (keyCode === UP_ARROW) {
          yEdit = (yEdit == 0) ? (iconHeight - 1) : --yEdit;
      }
      let cell = xEdit + iconWidth * yEdit;

      if (key == TOGGLE_KEY) {

          toggleCell(cell);
          save_data();

      } else if (key == 'r' || key == 'R') {
        
      } else if (key == 'u' || key == 'U') {

          undoMove();

      } else if (key == 's' || key == 'S') {
    
      } else if (key == 'd' || key == 'D') {

      } else if (key == 't' || key == 'T') {
        
      }
    
  } //if typeof xEdit != 'undefined'
  
  return false ;
}



function keyTyped() {
  return false ;
}









