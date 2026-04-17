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
        theme: (() => {
    const t = Themes[new URLSearchParams(window.location.search).get('theme') || 'darkGold'] || undefined
    const smallView = Math.min(window.innerWidth, window.innerHeight) < 500
    if (!window.__lcjsDebugOverlay) {
        window.__lcjsDebugOverlay = document.createElement('div')
        window.__lcjsDebugOverlay.style.cssText = 'position:fixed;top:0;left:0;background:rgba(0,0,0,0.7);color:#fff;padding:4px 8px;z-index:99999;font:12px monospace;pointer-events:none'
        if (document.body) document.body.appendChild(window.__lcjsDebugOverlay)
        setInterval(() => {
            if (!window.__lcjsDebugOverlay.parentNode && document.body) document.body.appendChild(window.__lcjsDebugOverlay)
            window.__lcjsDebugOverlay.textContent = window.innerWidth + 'x' + window.innerHeight + ' dpr=' + window.devicePixelRatio + ' small=' + (Math.min(window.innerWidth, window.innerHeight) < 500)
        }, 500)
    }
    return t && smallView ? lcjs.scaleTheme(t, 0.5) : t
})(),
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
