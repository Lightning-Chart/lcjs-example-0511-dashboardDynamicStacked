// Example of a Dashboard with several channels which you can re-arrange with drag & drop and hide/show at will

const lcjs = require('@arction/lcjs')
const xydata = require('@arction/xydata')
const { lightningChart, emptyFill, Themes, AxisTickStrategies } = lcjs
const { createProgressiveTraceGenerator } = xydata

const lc = lightningChart({
            resourcesBaseUrl: new URL(document.head.baseURI).origin + new URL(document.head.baseURI).pathname + 'resources/',
        })
const chart = lc
    .ChartXY({
        theme: Themes[new URLSearchParams(window.location.search).get('theme') || 'darkGold'] || undefined,
    })
    .setTitle('Drag & drop Y axes to rearrange')

const axisX = chart.getDefaultAxisX().setTickStrategy(AxisTickStrategies.Time)

chart.getDefaultAxisY().dispose()
let channels = new Array(5).fill(0).map((_, i, arr) => {
    const name = `Channel #${i + 1}`
    const iStack = arr.length - (i + 1)
    const axisY = chart.addAxisY({ iStack }).setMargins(10, 10)
    const lineSeries = chart
        .addPointLineAreaSeries({ axisY, dataPattern: 'ProgressiveX', automaticColorIndex: i })
        .setName(name)
        .setAreaFillStyle(emptyFill)

    createProgressiveTraceGenerator()
        .setNumberOfPoints(100_000)
        .generate()
        .toPromise()
        .then((data) => {
            lineSeries.add(data)
        })

    // Match LineSeries visibility with its Y axis
    lineSeries.onVisibleStateChanged((_, isVisible) => {
        axisY.setVisible(isVisible)
    })

    const ch = { name, axisY, lineSeries }
    return ch
})

//
//
// Drag & drop axis rearrange logic:
// LC Axis/chart currently don't expose HTML `draggable` property and `ondrop` event, so to implement drag & drop we need to create HTML div overlays as drag & drop source and target.
chart.forEachAxisY((axis) => axis.setMouseInteractions(false))
const chOverlays = channels.map((ch) => {
    const overlay = document.createElement('div')
    chart.engine.container.append(overlay)
    overlay.style.position = 'fixed'
    overlay.style.width = '100px'
    overlay.style.zIndex = '1000'
    overlay.style.cursor = 'grab'
    const positionOverlay = () => {
        requestAnimationFrame(() => {
            const interval = ch.axisY.getInterval()
            const startClient = chart.translateCoordinate({ x: 0, y: interval.start }, { x: axisX, y: ch.axisY }, chart.coordsClient)
            const endClient = chart.translateCoordinate({ x: 0, y: interval.end }, { x: axisX, y: ch.axisY }, chart.coordsClient)
            overlay.style.top = `${endClient.clientY}px`
            overlay.style.height = `${startClient.clientY - endClient.clientY}px`
        })
    }
    positionOverlay()
    ch.axisY.onIntervalChange(positionOverlay)
    ch.axisY.onVisibleStateChanged((_, isVisible) => {
        overlay.style.display = isVisible ? 'block' : 'none'
        chOverlays.forEach((overlay) => overlay.positionOverlay())
    })
    chart.onResize(positionOverlay)

    overlay.draggable = true
    overlay.ondragstart = (event) => {
        event.dataTransfer.setData('text', ch.name)
    }
    overlay.ondragover = (event) => {
        event.preventDefault()
    }
    overlay.ondrop = (event) => {
        event.preventDefault()
        const nameSrc = event.dataTransfer.getData('text')
        const axisSrc = channels.find((ch) => ch.name === nameSrc).axisY
        chart.swapAxes(ch.axisY, axisSrc)
    }
    return { positionOverlay }
})
