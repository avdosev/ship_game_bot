const MAX_LOAD_SHIP = 368;

export function startGame(levelMap, gameState) {

}


export function getNextCommand(gameState) {
    const homePort = getHomePort(gameState);
    const ship = gameState.ship;
    const shipOnHome = isEqualPosition(ship, homePort);
    let command = 'WAIT';
    if (shipOnHome && canLoadProduct(gameState)) {
        // нужно загрузить максимум по максимальной цене
        return loadProduct(gameState);
    } else if (onTradingPort(gameState)) {
        // TODO: в идеале нужно продавать по наиболее выгодным ценам
        return saleProduct(gameState);
    } else if (shipOnHome && !canLoadProduct(gameState)) { // уже загрузили товар
        // перемещаемся к цели
        return gotoPort(gameState);
    }
    return command;
}

//орррророоророороорооооорооорррррооорр
function canLoadProduct(gameState) {
    return gameState.ship.goods.length == 0;
}


function onTradingPort(gameState) {
    const { ship, ports } = gameState;
    return ports.reduce((acc, port) => acc || (isEqualPosition(port, ship) && !port.isHome), false);
}


function isEqualPosition(obj1, obj2) {
    return obj1.x == obj2.x && obj1.y == obj2.y;
}


function getHomePort(gameState) {
    const ship = gameState.ship;
    const portsOnCurrentPosition = gameState.ports.filter(port => ship.x == port.x && ship.y == port.y)
    return portsOnCurrentPosition[0];
}

/**
 * считаем что корабль пуст
 */
function loadProduct(gameState) {

}


function saleProduct(gameState) {

}

function profitOnSale(ship, port) {

}


function findOptimalPort({ship, ports, prices}) {
    return ports.reduce((max_port, port) => {
        const profitFromCurrentPort = profitOnSale(ship, port);
        const profitFromMaxPort = profitOnSale(ship, max_port);
        if (profitFromCurrentPort > profitFromCurrentPort) {
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