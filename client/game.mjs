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
            const radius = 2;
            for (let i = -radius; i <= radius; i++) {
                this.__pirates[pirate.y + i][pirate.x] = true;
            }
            for (let i = -radius; i <= radius; i++) {
                this.__pirates[pirate.y][pirate.x+i] = true;
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
        this._keys = [];
        this._priorities = [];
        this._length = 0;
    }

    heapUp(index) {
        const key = this._keys[index];
        const priority = this._priorities[index];

        while (index > 0) {

            const parentIndex = Math.floor((index - 1) / 2);
            if (this._priorities[parentIndex] <= priority) {
                break;
            }

            this._keys[index] = this._keys[parentIndex];
            this._priorities[index] = this._priorities[parentIndex];

            index = parentIndex;
        }


        this._keys[index] = key;
        this._priorities[index] = priority;
    }

    heapDown(index) {
        const key = this._keys[index];
        const priority = this._priorities[index];

        while (index < this._length) {
            const left = (index * 2) + 1;
            if (left >= this._length) {
                break;
            }

            let childPriority = this._priorities[left];
            let childKey = this._keys[left];
            let childIndex = left;

            const right = left + 1;
            if (right < this._length) {
                const rightPriority = this._priorities[right];
                if (rightPriority < childPriority) {
                    childPriority = rightPriority;
                    childKey = this._keys[right];
                    childIndex = right;
                }
            }

            if (childPriority >= priority) {
                break;
            }

            this._keys[index] = childKey;
            this._priorities[index] = childPriority;

            index = childIndex;
        }

        this._keys[index] = key;
        this._priorities[index] = priority;
    }

    push(key, priority) {
        this._keys.push(key);
        this._priorities.push(priority);
        this.heapUp(this._length);
        this._length++;
    }

    shift() {
        if (this._length === 0) {
            return undefined;
        }
        const key = this._keys[0];

        this._length--;

        if (this._length > 0) {
            this._keys[0] = this._keys[this._length];
            this._keys.pop();
            this._priorities[0] = this._priorities[this._length];
            this._priorities.pop();
            this.heapDown(0);
        } else {
            this._keys.pop();
            this._priorities.pop();
        }

        return key;
    }

    get length() {
        return this._length;
    }
}


let mapLevel; // так делать не правильно, тк мы теряем иммутебльность и чистоту функций, но задачу поставили именно так, а могли класс экспортировать например

export function startGame(levelMap, gameState) {
    mapLevel = new GameMap(levelMap);
}


export function getNextCommand(gameState) {
    mapLevel.updatePirates(gameState.pirates);
    const shipOnHome = onHomePort(gameState);
    let command = 'WAIT';
    if (shipOnHome && canLoadProduct(gameState)) {
        // нужно загрузить максимум по максимальной цене
        const product = getProductForLoad(gameState);
        if (product) command = `LOAD ${product.name} ${product.amount}`
    } else if (onTradingPort(gameState) && needSale(gameState)) {
        const product = getProductForSale(gameState);
        if (product) command = `SELL ${product.name} ${product.amount}`
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
            // console.log(new_node.way);
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
    return searchWay(obj1, obj2).length || Infinity;
}


function haveGoodsInPort(gameState) {
    return gameState.goodsInPort.length !== 0;
}


function canLoadProduct(gameState) {
    return gameState.ship.goods.length === 0 && gameState.goodsInPort.length !== 0;
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
    const tradingPorts = ports.filter(port => !port.isHome);
    const products = tradingPorts.map(port => {
        const price = getPriceByPortId(prices, port.portId);
        if (!price) return null;
        let optimalProduct = null;
        let max = 0;
        for (const product of goodsInPort) {
            if (price.hasOwnProperty(product.name)) {
                const amountInShip = Math.min(Math.floor(MAX_LOAD_SHIP / product.volume), product.amount);
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
            port
        }
    });
    const profitToPort = (obj) => obj && obj.product && productProfit(obj.priceInPort, obj.product, ship, obj.port);
    const profitObj = products.reduce((obj1, obj2) => {
        return (profitToPort(obj1) > profitToPort(obj2) ? obj1 : obj2);
    }, null)
    return profitObj && profitObj.product;
}


function needSale(gameState) {
    return gameState.ship.goods.length > 0 &&
        isEqualPosition(findOptimalPort(gameState), gameState.ship)
}


function getProductForSale({ship, prices, ports}) {
    const port = getCurrentPort({ship, ports});
    const priceOnCurrentPort = getPriceByPortId(prices, port.portId);
    const priceWithAmount = (product) => product && (priceOnCurrentPort[product.name]*product.amount);
    return ship.goods.reduce((obj1, obj2) => {
        return (priceWithAmount(obj1) > priceWithAmount(obj2) ? obj1 : obj2);
    }, null);
}


function productProfit(priceInPort, product, ship, port) {
    return priceInPort[product.name]*product.amount / distance(ship, port);
}


function profitOnSale(ship, port, price) {
    let profit = 0;
    if (!port.isHome && price) {
        // оперирую расстоянием, считая выгоду как прибыль в еденицу растояни (так как и во времени)
        profit = ship.goods.map((val, i, arr) => productProfit(price, val, ship, port)).reduce((a, b) => a+b, 0);
    }

    return profit;
}


function findOptimalPort({ship, ports, prices}) {
    let profitFromMaxPort = profitOnSale(ship, ports[0], getPriceByPortId(prices, ports[0].portId));
    let indexMax = 0;
    for (let i = 1; i < ports.length; i++) {
        const port = ports[i];
        const profitFromCurrentPort = profitOnSale(ship, port, getPriceByPortId(prices, port.portId));

        if (profitFromCurrentPort > profitFromMaxPort) {
            indexMax = i;
            profitFromMaxPort = profitFromCurrentPort;
        }
    }
    return ports[indexMax];
}

// Движение корабля

function gotoPort(gameState) {
    const ship = gameState.ship;
    const optimalPort = findOptimalPort(gameState);
    const way = searchWay(ship, optimalPort);
    const point = way[0] || optimalPort;

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