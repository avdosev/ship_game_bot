const MAX_LOAD_SHIP = 368;

export function startGame(levelMap, gameState) {

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


function aroundPirates(gameState, radius) {
    const { pirates, ship } = gameState;
    const distance = (obj1, obj2) => Math.abs(obj1.x-obj2.x)+Math.abs(obj1.y-obj2.y);
    return pirates.map(pirat => distance(pirat, ship) <= radius).reduce((a, b) => a || b, false);
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
    const priceWithAmount = (product) => product && [product.name]*product.amount;
    const product = ship.goods.reduce((obj1, obj2) => {
        return ( priceWithAmount(obj1) > priceWithAmount(obj2) ? obj1 : obj2 );
    }, null);
    return product;
}

function profitOnSale(ship, port, price) {
    let profit = 0;
    if (!port.isHome && price)
        profit = ship.goods.map((val, i, arr) => price[val.name]*val.amount).reduce((a, b) => a+b, profit);
    return profit;
}


function findOptimalPort({ship, ports, prices}) {
    return ports.reduce((max_port, port) => {
        const profitFromCurrentPort = profitOnSale(ship, port, getPriceByPortId(prices, port.portId));
        const profitFromMaxPort = profitOnSale(ship, max_port, getPriceByPortId(prices, max_port.portId));
        if (profitFromCurrentPort > profitFromMaxPort) {
            return port;
        } else {
            // TODO: норм варик оперировать расстоянием
            return max_port;
        }
    }, ports[0]);
}

// Движение корабля

function gotoPort(gameState) {
    const ship = gameState.ship;
    const optimalPort = findOptimalPort(gameState);

    if (ship.y > optimalPort.y) {
        return 'N'; // — North, корабль движется вверх по карте
    }
    if (ship.y < optimalPort.y) {
        return 'S'; // — South, корабль движется вниз по карте
    }
    if (ship.x > optimalPort.x) {
        return 'W'; // — West, корабль движется влево по карте
    }
    if (ship.x < optimalPort.x) {
        return 'E'; // — East, корабль движется вправо по карте
    }
    return 'WAIT'
}

function gotoOutPirates(gameState) {
    return 'WAIT';
}