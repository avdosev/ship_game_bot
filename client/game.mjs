const MAX_LOAD_SHIP = 368;

class GameMap {

    constructor(levelMap) {
        this.__map = levelMap.split('\n');
    }

    get Height() {
        return this.__map.length;
    }

    get Width() {
        return this.__map[0].length;
    }

    Get(y, x) {
        return this.__map[y][x];
    }
}


class PriorityQueue {
    constructor() {
        this._data = [];
    }

    push(obj, priority) {
        this._data.push({obj, priority});
        this._data.sort((a, b) => a.priority - b.priority);
    }

    pop() {
        const elem = this._data.pop();
        return elem || elem.obj;
    }

    get top() {
        return this._data[this._data.length-1];
    }
}


let mapLevel; // так делать не правильно, тк мы теряем иммутебльность и чистоту функций, но задачу поставили именно так, а могли класс экспортировать например

export function startGame(levelMap, gameState) {
    mapLevel = new GameMap(levelMap);
    console.log(mapLevel);
}


export function getNextCommand(gameState) {
    const shipOnHome = onHomePort(gameState);
    let command = 'WAIT';
    if (shipOnHome && canLoadProduct(gameState)) {
        // нужно загрузить максимум по максимальной цене
        const product = getProductForLoad(gameState);
        if (product)
            command = `LOAD ${product.name} ${product.amount}`
    } else if (onTradingPort(gameState) && needSale(gameState)) {
        // TODO: в идеале нужно продавать по наиболее выгодным ценам
        const product = getProductForSale(gameState);
        if (product)
            command = `SELL ${product.name} ${product.amount}`
    } else if (aroundPirates(gameState, 5) && !aroundPirates(gameState, 2)) {
        const bool = aroundPirates(gameState, 3);
        command = bool ? "WAIT" : gotoOutPirates(gameState);
    } else { // уже загрузили товар
        // перемещаемся к цели
        const vector = gotoPort(gameState);
        command = vector;
    }
    return command;
}

/**
 * Поиск в ширину
 * @param objSource
 * @param objDestination
 * @returns массив точек для прохода к цели, пустота если пройти нельзя
 */
function searchWay(objSource, objDestination) {
    const queue = [{...objSource, way: []}];
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
        visited[node.y][node.x] = true;
        for (const direction of directions) {
            const new_node = {
                x: node.x + direction.x,
                y: node.y + direction.y
            };
            if (isCorrectWay(new_node) && !visited[new_node.y][new_node.x]) {
                const {x, y} = new_node;
                new_node.way = [...node.way, {x, y}];
                if (isEqualPosition(new_node, objDestination)) {
                    console.log(visited);
                    return new_node.way;
                }
                queue.push(new_node);
            }
        }
    }
    return [];
}


function distance(obj1, obj2) {
    return Math.abs(obj1.x-obj2.x)+Math.abs(obj1.y-obj2.y);
}


function aroundPirates(gameState, radius) {
    const { pirates, ship } = gameState;
    return pirates.map(pirate => distance(pirate, ship) <= radius).reduce((a, b) => a || b, false);
}


function canLoadProduct(gameState) {
    return gameState.ship.goods.length === 0;
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
function getProductForLoad({goodsInPort, prices, }) {
    const products = goodsInPort.map(good => {
        return {
            'name': good.name,
            'max_price': Math.max(...prices.map(port_price => port_price[good.name])),
            'amount': Math.floor(MAX_LOAD_SHIP / good.volume),
        }
    });
    const priceWithAmount = (product) => product && product.max_price * product.amount;
    const optimalProduct = products.reduce((p, v) => {
        return ( priceWithAmount(p) > priceWithAmount(v) ? p : v );
    }, null);
    return optimalProduct;
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
    return ports.reduce((max_port, port) => {
        const profitFromCurrentPort = profitOnSale(ship, port, getPriceByPortId(prices, port.portId));
        const profitFromMaxPort = profitOnSale(ship, max_port, getPriceByPortId(prices, max_port.portId));

        if (profitFromCurrentPort > profitFromMaxPort) {
            return port;
        } else {
            return max_port;
        }
    }, ports[0]);
}

// Движение корабля

function gotoPort(gameState) {
    const ship = gameState.ship;
    const optimalPort = findOptimalPort(gameState);
    const way = searchWay(ship, optimalPort);
    const point = way[0];

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

function gotoOutPirates(gameState) {
    return 'WAIT';
}