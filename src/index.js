// Example of a Dashboard with several channels which you can re-arrange with drag & drop and hide/show at will

const lcjs = require('@lightningchart/lcjs')
const xydata = require('@lightningchart/xydata')
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
    const axisY = chart.addAxisY({ iStack }).setMargins(5, 5)
    const lineSeries = chart
        .addLineSeries({ axisY, schema: { x: { pattern: 'progressive' }, y: { pattern: null } }, automaticColorIndex: i })
        .setName(name)

    createProgressiveTraceGenerator()
        .setNumberOfPoints(100_000)
        .generate()
        .toPromise()
        .then((data) => {
            lineSeries.appendJSON(data)
        })

    // Match LineSeries visibility with its Y axis
    lineSeries.addEventListener('visiblechange', (event) => {
        const { isVisible } = event
        axisY.setVisible(isVisible)
    })

    // Drag & drop logic for Y axis
    axisY.setUserInteractions({ rectangleZoom: false })
    axisY.draggable = true
    axisY.addEventListener('dragstart', (event) => {
        if (!event.dataTransfer) return
        event.dataTransfer.setData('text', JSON.stringify({ name }))
        event.dataTransfer.setDragImage(new Image(), 0, 0)
    })
    axisY.addEventListener('dragover', (event) => {
        event.preventDefault()
    })
    axisY.addEventListener('drop', (event) => {
        if (!event.dataTransfer) return
        const srcName = JSON.parse(event.dataTransfer.getData('text')).name
        if (!srcName) return
        const srcCh = channels.find((item) => item.name === srcName)
        chart.swapAxes(axisY, srcCh.axisY)
    })
    const ch = { name, axisY, lineSeries }
    return ch
})
