const MAX_LOAD_SHIP = 368;

class GameMap {

    constructor(levelMap, pirates) {
        this.__map = levelMap.split('\n');
        const pr = new Array(this.Height);
        for (let i = 0; i < this.Height; i++) {
            pr[i] = (new Uint8Array(this.Width).fill(false));
        }
        this.__pirates = pr;
        this.__previos_pirates = pirates;
    }

    updatePirates(pirates, ship) {
        this.__previos_pirates = pirates.map((pirate, i) => {
            return {
                ...pirate,
                vector: {
                    x: pirate.x-this.__previos_pirates[i].x,
                    y: pirate.y-this.__previos_pirates[i].y
                }
            }
        });
        for (let i = 0; i < this.Height; i++) {
            this.__pirates[i].fill(false);
        }

        this.__previos_pirates.forEach(pirate => {
            const radius = 1;

            const checkX = x => x < this.Width  && x >= 0;
            const checkY = y => y < this.Height && y >= 0;

            // current position
            for (let i = -radius; i <= radius; i++) {
                if (checkY(pirate.y+i))
                    this.__pirates[pirate.y+i][pirate.x] = true;
                if (checkX(pirate.x+i))
                    this.__pirates[pirate.y][pirate.x + i] = true;
            }

            function byVector(vec, callback) {
                if (vec == 0) return;
                const magicConst = 3; // Не увлекаемся вектором
                const dist = magicConst;
                for (let k = 0; k < dist; k++) {
                    const val = k*vec;
                    callback(val);
                }
            }

            byVector(pirate.vector.y, (val) => {
                const y = pirate.y+val;
                if (checkY(y))
                    this.__pirates[y][pirate.x] = true;
            });
            byVector(pirate.vector.x, (val) => {
                const x = pirate.x+val;
                if (checkX(x))
                    this.__pirates[pirate.y][x] = true;
            });


        });
    }

    get Height() {
        return this.__map.length;
    }

    get Width() {
        return this.__map[0].length;
    }

    Get(y, x) {
        if (this.__pirates[y][x]) return '#';
        return this.__map[y][x];
    }
}


class PriorityQueue {
    constructor() {
        this._objs = [];
        this._length = 0;
    }

    heapUp(index) {
        const obj = this._objs[index];

        while (index > 0) {

            const parentIndex = Math.floor((index - 1) / 2);
            if (this._objs[parentIndex].priority <= obj.priority) {
                break;
            }

            this._objs[index] = this._objs[parentIndex];

            index = parentIndex;
        }


        this._objs[index] = obj;
    }

    heapDown(index) {
        const obj = this._objs[index];

        while (index < this._length) {
            const left = (index * 2) + 1;
            if (left >= this._length) {
                break;
            }

            let childObj = this._objs[left];
            let childIndex = left;

            const right = left + 1;
            if (right < this._length) {
                const rightObj = this._objs[right];
                if (rightObj.priority < childObj.priority) {
                    childObj = rightObj;
                    childIndex = right;
                }
            }

            if (childObj.priority >= obj.priority) {
                break;
            }

            this._objs[index] = childObj;

            index = childIndex;
        }

        this._objs[index] = obj;
    }

    push(key, priority) {
        this._objs.push({key, priority});
        this.heapUp(this._length);
        this._length++;
    }

    shift() {
        if (this._length === 0) {
            return undefined;
        }
        const obj = this._objs[0];

        this._length--;

        if (this._length > 0) {
            this._objs[0] = this._objs[this._length];
            this._objs.pop();
            this.heapDown(0);
        } else {
            this._objs.pop();
        }

        return obj.key;
    }

    get length() {
        return this._length;
    }
}


class Ship {
    constructor() {
        this._command = 'WAIT';
    }

    get command() {
        return this._command;
    }

    wait() {
        this._command = 'WAIT';
    }

    toNorth() {
        this._command = 'N'; // корабль движется вверх по карте
    }

    toSouth() {
        this._command = 'S'; // корабль движется вниз по карте
    }

    toWest() {
        this._command = 'W'; // корабль движется влево по карте
    }

    toEast() {
        this._command = 'E'; // корабль движется вправо по карте
    }

    load(product) {
        this._command = `LOAD ${product.name} ${product.amount}`;
    }

    sell(product) {
        this._command = `SELL ${product.name} ${product.amount}`;
    }

}


let mapLevel; // так делать не правильно, тк мы теряем иммутебльность и чистоту функций, но задачу поставили именно так, а могли класс экспортировать например
let lenToPorts;
let homePort;
let productVolume; // dict productname to productvolume
let prev_port;
let prev_way;
let ship;
export function startGame(levelMap, gameState) {
    mapLevel = new GameMap(levelMap, gameState.pirates);
    ship = new Ship();
    lenToPorts = {};
    productVolume = {};
    gameState.goodsInPort.forEach(good => {
        productVolume[good.name] = good.volume;
    });
    prev_port = null;
    prev_way = [];
    homePort = gameState.ports.reduce((p1, p2) => p2.isHome ? p2 : p1, null);
}


export function getNextCommand(gameState) {
    mapLevel.updatePirates(gameState.pirates, gameState.ship);
    const shipOnHome = onHomePort(gameState);
    ship.wait();
    if (shipOnHome && needLoadProduct(gameState)) {
        // нужно загрузить максимум по максимальной цене
        const product = getProductForLoad(gameState);
        if (product) ship.load(product);
        else gotoPort(gameState);
    } else if (onTradingPort(gameState) && needSale(gameState)) {
        const product = getProductForSale(gameState);
        if (product) ship.sell(product);
        else gotoPort(gameState);
    } else if (gameState.ship.goods.length > 0 || haveGoodsInPort(gameState)) { // уже загрузили товар
        // перемещаемся к цели
        gotoPort(gameState);
    }

    return ship.command;
}

/**
 * Поиск A*
 * @param objSource
 * @param objDestination
 * @returns массив точек для прохода к цели, пустота если пройти нельзя
 */
function searchWay(objSource, objDestination) {
    const queue = new PriorityQueue();
    queue.push({...objSource, way: []}, 0);
    const visited = new Array(mapLevel.Height);
    for (let i = 0; i < mapLevel.Height; i++) {
        visited[i] = (new Array(mapLevel.Width).fill(false));
    }
    const directions = [
        {x: -1, y:  0},
        {x:  1, y:  0},
        {x:  0, y: -1},
        {x:  0, y:  1},
    ];

    const isCorrectWay = obj => obj.x >= 0 && obj.x < mapLevel.Width && obj.y >= 0 && obj.y < mapLevel.Height && mapLevel.Get(obj.y, obj.x) !== '#';

    while (queue.length !== 0) {
        const node = queue.shift();

        if (isEqualPosition(node, objDestination)) {
            // console.log(visited);
            return node.way;
        }

        visited[node.y][node.x] = true;
        for (const direction of directions) {
            const new_node = {
                x: node.x + direction.x,
                y: node.y + direction.y
            };
            if (isCorrectWay(new_node) && !visited[new_node.y][new_node.x]) {
                const {x, y} = new_node;
                new_node.way = [...node.way, {x, y}];
                queue.push(new_node, new_node.way.length + manhattanDistance(new_node, objDestination));
            }
        }
    }
    return [];
}


function manhattanDistance(obj1, obj2) {
    return Math.abs(obj1.x-obj2.x)+Math.abs(obj1.y-obj2.y);
}


function distance(obj1, obj2) {
    if (isEqualPosition(obj1, obj2)) return 1;
    const wayLength = searchWay(obj1, obj2).length;
    return wayLength || Infinity;
}


function haveGoodsInPort(gameState) {
    return gameState.goodsInPort.length !== 0;
}


function freeSpaceInShip(ship) {
    return ship.goods.reduce((acc, cur) => acc - productVolume[cur.name]*cur.amount, MAX_LOAD_SHIP);
}


function needLoadProduct(gameState) {
    const freeSpace = freeSpaceInShip(gameState.ship);

    if (freeSpace >= 10) {
        // возможно мы можем еще догрузить товаров в порт который плывем
        // TODO: нужно учесть оптимальность подгрузки
        const port = findOptimalPort(gameState);
        const price = getPriceByPortId(gameState.prices, port.portId);
        return port.isHome || gameState.goodsInPort.reduce(
            (acc, good) => acc || (price.hasOwnProperty(good.name) && good.volume < freeSpace),
            false);
    } else {
        return false;
    }
}


function getCurrentPort({ship, ports}) {
    const prts = ports.filter(port => isEqualPosition(port, ship));
    return prts.length === 1 ? prts[0] : null;
}

function getPriceByPortId(prices, portId) {
    return prices.filter(price => price.portId === portId)[0];
}

function onTradingPort(gameState) {
    const port = getCurrentPort(gameState);
    return port ? !port.isHome : false;
}


function onHomePort(gameState) {
    const port = getCurrentPort(gameState);
    return port ? port.isHome : false;
}

function isEqualPosition(obj1, obj2) {
    return obj1.x === obj2.x && obj1.y === obj2.y;
}

function maxElement(container, keyCallback, defaultValue = null) {
    return container.reduce((obj1, obj2) => {
        return keyCallback(obj1) > keyCallback(obj2) ? obj1 : obj2;
    }, defaultValue);
}


function getProductForLoad({goodsInPort, prices, ports, ship}) {
    const freeSpaceShip = freeSpaceInShip(ship);
    const tradingPorts = ports.filter(port => !port.isHome);
    const products = tradingPorts.map((port, index) => {
        const price = getPriceByPortId(prices, port.portId);
        if (!price) return null;
        let optimalProduct = null;
        let max = 0;
        for (const product of goodsInPort) {
            if (price.hasOwnProperty(product.name)) {
                const amountInShip = Math.min(Math.floor(freeSpaceShip / product.volume), product.amount);
                const profit = price[product.name] * amountInShip;
                if (max < profit && amountInShip > 0) {
                    optimalProduct = {
                        name: product.name,
                        amount: amountInShip
                    };
                    max = profit;
                }
            }
        }
        return {
            product: optimalProduct,
            priceInPort: price,
            port, index
        }
    });
    products.forEach(obj => {
        if (obj && obj.product && !lenToPorts.hasOwnProperty(obj.port.portId))
            lenToPorts[obj.port.portId] = distance(obj.port, homePort); // lazy init
    });
    const profitToPort = (obj) => obj && obj.product && productProfit(obj.priceInPort, obj.product, lenToPorts[obj.port.portId]);
    const profitObj = maxElement(products, profitToPort);
    return profitObj && profitObj.product;
}


function needSale(gameState) {
    return gameState.ship.goods.length > 0 &&
        isEqualPosition(findOptimalPort(gameState), gameState.ship);
}


function getProductForSale({ship, prices, ports}) {
    const port = getCurrentPort({ship, ports});
    const priceOnCurrentPort = getPriceByPortId(prices, port.portId);
    const priceWithAmount = (product) => product && (priceOnCurrentPort[product.name]*product.amount);
    return maxElement(ship.goods, priceWithAmount);
}


function productProfit(priceInPort, product, len) {
    return priceInPort[product.name]*product.amount / len;
}


function profitOnSale(ship, port, price) {
    let profit = 0;
    if (!port.isHome && price) {
        // оперирую расстоянием, считая выгоду как прибыль в еденицу растояни (так как и во времени)
        profit = ship.goods.map((val, i, arr) => {
            if (price.hasOwnProperty(val.name)) {
                return productProfit(price, val, manhattanDistance(ship, port));
            }
            return 0;
        }).reduce((a, b) => a+b, 0);
    }

    return profit;
}


function findOptimalPort({ship, ports, prices}) {
    let profitFromMaxPort = profitOnSale(ship, ports[0], getPriceByPortId(prices, ports[0].portId));
    let indexMax = 0;
    for (let i = 1; i < ports.length; i++) {
        const port = ports[i];
        const profit = profitOnSale(ship, port, getPriceByPortId(prices, port.portId));

        if (profit > profitFromMaxPort) {
            indexMax = i;
            profitFromMaxPort = profit;
        }
    }
    return ports[indexMax];
}

// Движение корабля
function gotoPort(gameState) {
    const shipLocation = gameState.ship;
    const port = findOptimalPort(gameState);
    const way = searchWay(shipLocation, port);
    const nextPoint =  way[0] || port;

    if (prev_port && isEqualPosition(prev_port, port) && prev_way.length+1 === way.length) {
        ship.wait();
        return;
    }

    prev_port = port;
    prev_way = way;

    if (shipLocation.y > nextPoint.y) {
        ship.toNorth(); // — North, корабль движется вверх по карте
    } else if (shipLocation.y < nextPoint.y) {
        ship.toSouth(); // — South, корабль движется вниз по карте
    } else if (shipLocation.x > nextPoint.x) {
        ship.toWest(); // — West, корабль движется влево по карте
    } else if (shipLocation.x < nextPoint.x) {
        ship.toEast(); // — East, корабль движется вправо по карте
    }
}