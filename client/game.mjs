const MAX_LOAD_SHIP = 368;

class GameMap {

    constructor(levelMap) {
        this.__map = levelMap.split('\n');
        const pr = new Array(this.Height);
        for (let i = 0; i < this.Height; i++) {
            pr[i] = (new Uint8Array(this.Width).fill(false));
        }
        this.__pirates = pr;
    }

    updatePirates(pirates) {
        for (let i = 0; i < this.Height; i++) {
            this.__pirates[i].fill(false);
        }

        pirates.forEach(pirate => {
            const radius = 1;
            for (let i = -radius; i <= radius; i++) {
                if (pirate.y+i < this.Height && pirate.y+i >= 0)
                    this.__pirates[pirate.y+i][pirate.x] = true;
                if (pirate.x + i < this.Width && pirate.x + i >= 0)
                    this.__pirates[pirate.y][pirate.x + i] = true;
            }
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


let mapLevel; // так делать не правильно, тк мы теряем иммутебльность и чистоту функций, но задачу поставили именно так, а могли класс экспортировать например
let lenToPorts;
let homePort;
let productVolume; // dict productname to productvolume
export function startGame(levelMap, gameState) {
    mapLevel = new GameMap(levelMap);
    lenToPorts = {};
    productVolume = {};
    gameState.goodsInPort.forEach(good => {
        productVolume[good.name] = good.volume;
    });
    homePort = gameState.ports.reduce((p1, p2) => p2.isHome ? p2 : p1, null);
}


export function getNextCommand(gameState) {
    mapLevel.updatePirates(gameState.pirates);
    const shipOnHome = onHomePort(gameState);
    let command = 'WAIT';
    if (shipOnHome && needLoadProduct(gameState)) {
        // нужно загрузить максимум по максимальной цене
        const product = getProductForLoad(gameState);
        if (product) command = `LOAD ${product.name} ${product.amount}`;
        else command = gotoPort(gameState);
    } else if (onTradingPort(gameState) && needSale(gameState)) {
        const product = getProductForSale(gameState);
        if (product) command = `SELL ${product.name} ${product.amount}`;
        else command = gotoPort(gameState);
    } else if (gameState.ship.goods.length > 0 || haveGoodsInPort(gameState)) { // уже загрузили товар
        // перемещаемся к цели
        command = gotoPort(gameState);
    }
    // console.log(command);
    return command;
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
    if (isEqualPosition(obj1, obj2)) return 0;
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
    const thereLoad = freeSpace < MAX_LOAD_SHIP;
    if (thereLoad) {
        // возможно мы можем еще догрузить товаров в порт который плывем
        // TODO: нужно учесть оптимальность подгрузки
        const port = findOptimalPort(gameState);
        const price = getPriceByPortId(gameState.prices, port.portId);
        return (freeSpace >= 50) && gameState.goodsInPort.reduce(
            (acc, good) => acc || (price.hasOwnProperty(good.name) && good.volume <= freeSpace),
            false);
    }
    return gameState.goodsInPort.length !== 0;
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

/**
 * считаем что корабль пуст
 */
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
                const profit = price[product.name]*amountInShip;
                if (max < profit) {
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
    const profitObj = products.reduce((obj1, obj2, index) => {
        return (profitToPort(obj1) > profitToPort(obj2) ? obj1 : obj2);
    }, null);
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
    return ship.goods.reduce((obj1, obj2) => {
        return (priceWithAmount(obj1) > priceWithAmount(obj2) ? obj1 : obj2);
    }, null);
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
    const ship = gameState.ship;
    const port = findOptimalPort(gameState);
    if (port === undefined) return 'WAIT';
    const way = searchWay(ship, port);
    const point = way[0] || port;

    if (ship.y > point.y) {
        return 'N'; // — North, корабль движется вверх по карте
    }
    if (ship.y < point.y) {
        return 'S'; // — South, корабль движется вниз по карте
    }
    if (ship.x > point.x) {
        return 'W'; // — West, корабль движется влево по карте
    }
    if (ship.x < point.x) {
        return 'E'; // — East, корабль движется вправо по карте
    }
    return 'WAIT'
}