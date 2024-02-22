// Example of a Dashboard with several channels which you can re-arrange with drag & drop and hide/show at will

const lcjs = require('@arction/lcjs')
const xydata = require('@arction/xydata')
const { lightningChart, emptyFill, emptyLine, transparentFill, Themes, AxisTickStrategies, synchronizeAxisIntervals, LegendBoxBuilders } =
    lcjs
const { createProgressiveTraceGenerator } = xydata

const lc = lightningChart()
const layout = document.createElement('div')
const domContainer = document.getElementById('chart') || document.body
if (domContainer === document.body) {
    document.body.style.width = '100vw'
    document.body.style.height = '100vh'
    document.body.style.margin = '0px'
}
domContainer.append(layout)
layout.style.width = '100%'
layout.style.height = '100%'
layout.style.display = 'flex'
layout.style.flexDirection = 'column'

const uiPanelContainer = document.createElement('div')
uiPanelContainer.style.height = '40px'
layout.append(uiPanelContainer)
const uiPanel = lc.UIPanel({
    container: uiPanelContainer,
    // theme: Themes.darkGold
})
const legend = uiPanel
    .addLegendBox(LegendBoxBuilders.HorizontalLegendBox)
    .setTitle('')
    .setBackground((background) => background.setFillStyle(emptyFill).setStrokeStyle(emptyLine))

let channels = new Array(5).fill(0).map((_, i) => {
    // 40px is height of UIPanel
    // 5 is number of channels
    const parentHeight = domContainer.getBoundingClientRect().height
    const divHeight = (parentHeight - 40) / 5 + 'px'

    const name = `Channel #${i + 1}`
    const container = document.createElement('div')
    container.style.height = divHeight
    layout.append(container)
    const chart = lc
        .ChartXY({
            container,
            // theme: Themes.darkGold
        })
        .setTitle('')
        .setPadding({ right: 60 })
        .setAutoCursor((cursor) => cursor.setTickMarkerXVisible(false))
    const axisX = chart.getDefaultAxisX()
    const axisY = chart.getDefaultAxisY().setTitle(name).setThickness(80)
    const lineSeries = chart.addLineSeries({ dataPattern: { pattern: 'ProgressiveX' }, automaticColorIndex: i }).setName(name)

    createProgressiveTraceGenerator()
        .setNumberOfPoints(100_000)
        .generate()
        .toPromise()
        .then((data) => {
            lineSeries.add(data)
        })

    // Match LineSeries visibility with that of whole channel and chart.
    lineSeries.onVisibleStateChanged((_, isVisible) => {
        container.style.display = isVisible ? 'block' : 'none'
        ch.visible = isVisible
        checkBottomChChanged()
    })
    legend.add(lineSeries)
    container.draggable = true
    container.ondragstart = (event) => event.dataTransfer.setData('text', ch.position)
    container.ondragover = (event) => event.preventDefault()
    container.ondrop = (event) => {
        event.preventDefault()
        const positionSrc = Number(event.dataTransfer.getData('text'))
        const chSrc = channels.find((item) => item.position === positionSrc)
        const chTar = ch
        if (chSrc === chTar) {
            return
        }
        const domPositionSrc = chSrc.position + 1 // +1 because of UIPanel
        const domPositionTar = chTar.position + 1 // +1 because of UIPanel
        swapChildren(layout, domPositionSrc, domPositionTar)
        chSrc.position = chTar.position
        chTar.position = positionSrc
        channels.sort((a, b) => a.position - b.position)
        checkBottomChChanged()
    }
    const ch = { name, visible: true, container, chart, axisX, axisY, lineSeries, position: i }
    return ch
})

synchronizeAxisIntervals(...channels.map((ch) => ch.axisX))
const theme = channels[0].chart.getTheme()

const checkBottomChChanged = () => {
    const lastVisibleCh = channels
        .slice()
        .reverse()
        .find((ch) => ch.visible)
    channels.forEach((ch, i) => {
        ch.axisX
            .setTickStrategy(AxisTickStrategies.Time, (ticks) =>
                ch === lastVisibleCh
                    ? ticks
                          .setMajorTickStyle((major) =>
                              major
                                  .setLabelFillStyle(theme.xAxisTimeTicks.majorTickStyle.labelFillStyle)
                                  .setTickStyle(theme.xAxisTimeTicks.majorTickStyle.tickStyle),
                          )
                          .setMinorTickStyle((minor) =>
                              minor
                                  .setLabelFillStyle(theme.xAxisTimeTicks.minorTickStyle.labelFillStyle)
                                  .setTickStyle(theme.xAxisTimeTicks.minorTickStyle.tickStyle),
                          )
                    : ticks
                          .setMajorTickStyle((major) => major.setLabelFillStyle(transparentFill).setTickStyle(emptyLine))
                          .setMinorTickStyle((minor) => minor.setLabelFillStyle(transparentFill).setTickStyle(emptyLine)),
            )
            .setStrokeStyle(ch === lastVisibleCh ? theme.xAxisStrokeStyle : emptyLine)
            .setThickness(ch === lastVisibleCh ? { min: undefined, max: undefined } : 0)
    })
}
checkBottomChChanged()

// Davide Cannizzo https://stackoverflow.com/a/64647505/9288063
function swapChildren(parentElement, index1, index2) {
    if (index1 === index2) return
    if (index1 > index2) {
        const temp = index1
        index1 = index2
        index2 = temp
    }
    const { [index1]: element1, [index2]: element2 } = parentElement.childNodes
    if (index2 === index1 + 1) {
        parentElement.insertBefore(element2, element1)
    } else {
        const reference = element2.nextSibling
        parentElement.replaceChild(element2, element1)
        parentElement.insertBefore(element1, reference)
    }
}
