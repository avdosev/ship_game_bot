const MAX_LOAD_SHIP = 368;

export function startGame(levelMap, gameState) {

}


export function getNextCommand(gameState) {
    const homePort = getHomePort(gameState);
    const ship = gameState.ship;
    const shipOnHome = isEqualPosition(ship, homePort);
    if (shipOnHome && canLoadProduct(gameState)) {
        // нужно загрузить максимум по максимальной цене
        loadProduct(gameState);
    } else if (onTradingPort(gameState)) {
        // в идеале нужно продавать по наиболее выгодным ценам, но нет,
        // я хочу как можно дольше сохранять имутабельность функции
        saleProduct(gameState);
    } else if (shipOnHome && !canLoadProduct(gameState)) { // уже загрузили товар
        // перемещаемся к цели
        gotoPort(gameState);
    }
    return 'WAIT'
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


function loadProduct(gameState) {

}


function saleProduct(gameState) {

}


function gotoPort(gameState) {

}