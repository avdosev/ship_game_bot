const MAX_LOAD_SHIP = 368;

export function startGame(levelMap, gameState) {

}


export function getNextCommand(gameState) {
    const shipOnHome = onHomePort(gameState);
    let command = 'WAIT';
    if (shipOnHome && canLoadProduct(gameState)) {
        // нужно загрузить максимум по максимальной цене
        const product = getProductForLoad(gameState);
        command = `LOAD ${product.name} ${product.amount}`
    } else if (onTradingPort(gameState)) {
        // TODO: в идеале нужно продавать по наиболее выгодным ценам
        const product = getProductForSale(gameState);
        command = `SELL ${product.name} ${product.amount}`
    } else if (shipOnHome && !canLoadProduct(gameState)) { // уже загрузили товар
        // перемещаемся к цели
        return gotoPort(gameState);
    }
    return command;
}


function canLoadProduct(gameState) {
    return gameState.ship.goods.length === 0;
}

function getCurrentPort({ship, ports}) {
    const prts = ports.filter(port => isEqualPosition(port, ship));
    return prts.length === 1 ? prts[0] : null;
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
function getProductForLoad({goodsInPorts, prices, }) {
    const product = goodsInPorts.map();
    return product;
}


function getProductForSale({ship, prices}) {

}

function profitOnSale(ship, port, prices) {
    const price = prices.filter(price => price.portId === port.portId)[0];
    let profit = 0;
    profit = ship.goods.map((val, i, arr) => price[val.name]*val.amount).reduce((a, b) => a+b, profit);
    return profit;
}


function findOptimalPort({ship, ports, prices}) {
    return ports.reduce((max_port, port) => {
        const profitFromCurrentPort = profitOnSale(ship, port, prices);
        const profitFromMaxPort = profitOnSale(ship, max_port, prices);
        if (profitFromCurrentPort > profitFromMaxPort) {
            return port;
        } else {
            // TODO: норм варик оперировать расстоянием
            return max_port;
        }
    }, ports[0]);
}

function gotoPort(gameState) {
    const ship = gameState.ship;
    const optimalPort = findOptimalPort(gameState);

    if (ship.y < optimalPort.y) {
        return 'N'; // — North, корабль движется вверх по карте
    }
    if (ship.y > optimalPort.y) {
        return 'S'; // — South, корабль движется вниз по карте
    }
    if (ship.x > optimalPort.x) {
        return 'W'; // — West, корабль движется влево по карте
    }
    if (ship.x < optimalPort.x) {
        return 'E'; // — East, корабль движется вправо по карте
    }
}