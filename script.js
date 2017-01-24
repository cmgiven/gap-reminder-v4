var DATA_PATH = 'data.csv'
var MIN_YEAR = 1950
var MAX_YEAR = 2015
var ANIMATION_INTERVAL = 750

var Scatterplot
var Controls
var app

Scatterplot = function () {
    this.setup()
}

Scatterplot.prototype = {
    // Our chart has two lifecycle functions, setup and update. The setup function
    // is only ever called once; we'll use it to create anything that doesn't change
    // depending on what year is selected. It in turn will call the update function,
    // which is used every time the year changes.
    setup: function () {
        var chart = this

        var margin = { top: 15, right: 15, bottom: 30, left: 30 }

        var width = 600 - margin.left - margin.right
        var height = 400 - margin.top - margin.bottom

        chart.svg = d3.select('#scatterplot')
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')

        chart.scales = {
            r: d3.scaleSqrt()
                .domain([0, d3.max(app.data, function (d) { return d.population })])
                .range([0, 60]),
            x: d3.scaleLinear()
                .domain([0, d3.max(app.data, function (d) { return d.totalFertility })])
                .range([0, width]),
            y: d3.scaleLinear()
                .domain([0, d3.max(app.data, function (d) { return d.lifeExpectancy })])
                .range([height, 0])
        }

        var xAxis = d3.axisBottom().scale(chart.scales.x)
        var yAxis = d3.axisLeft().scale(chart.scales.y)

        chart.svg.append('g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(0,' + height + ')')
            .call(xAxis)

        chart.svg.append('g')
            .attr('class', 'y axis')
            .call(yAxis)

        chart.tooltip = chart.svg.append('text')
            .attr('x', width)
            .attr('y', 0)
            .attr('class', 'tooltip')

        chart.update()
    },

    update: function () {
        var chart = this

        var yearData = app.data.filter(function (d) {
            return d.year === app.globals.selected.year
        })

        var countries = chart.svg.selectAll('.country')
            .data(yearData, function (d) { return d.country })

        var enterCountries = countries.enter().append('circle')
        var exitCountries  = countries.exit()
        var allCountries   = countries.merge(enterCountries)

        enterCountries
            .attr('class', function (d) {
                return 'country continent-' + d.continent.replace(' ', '-')
            })
            .on('mouseover', function (d) {
                chart.tooltip.text(d.country)
            })
            .on('mouseout', function () {
                chart.tooltip.text('')
            })

        allCountries
            .attr('r', function (d) { return chart.scales.r(d.population) })
            .attr('cx', function (d) { return chart.scales.x(d.totalFertility) })
            .attr('cy', function (d) { return chart.scales.y(d.lifeExpectancy) })

        exitCountries.remove()
    }
}

// Controls has two responsibilites in our simple app: it watches and updates the
// play/pause button, and it updates the year label. In a more complex app, there
// could be many more filters and options.
Controls = function (selector) {
    this.div = d3.select(selector)

    this.setup()
};

Controls.prototype = {
    setup: function () {
        this.div.select('#year-label').text(app.globals.selected.year)

        this.div.select('#animate').on('click', app.toggleAnimation)

        this.update()
    },

    update: function () {
        this.div.select('#year-label')
            // Delay the label so that it updates at the apex of the chart transition.
            .transition(0).delay(ANIMATION_INTERVAL / 2)
            .text(app.globals.selected.year)

        this.div.select('#animate')
            .classed('playing', app.globals.animating)
            .classed('paused', !app.globals.animating)
    }
}

app = {
    data: [],
    components: [],

    // Here we define the global variables available to any components on the page. In
    // order to keep things tidy, only functions within this app object should ever modify
    // these variables, and we need to take care to ensure that any component that uses
    // them is appropriately updated.
    globals: {
        available: { years: d3.range(MIN_YEAR, MAX_YEAR + 1) },
        selected: { year: MIN_YEAR },
        animating: false
    },

    initialize: function (data) {
        app.data = data

        // It isn't strictly necessary to instantiate components in this way, as our
        // simple app only ever ever has one Controls and one Scatterplot. This pattern
        // more useful when there are multiple instances of a given component, each which
        // may have different options.
        app.components.scatterplot = new Scatterplot('#scatterplot')
        app.components.controls    = new Controls('#controls')

        // If we wanted to make our chart responsive, we could move the code that sizes
        // things from the setup function into a new resize function, which would be
        // called each time the window is resized. I typically use three lifecycle
        // functions for each chart, each of which calls any successive functions:
        // 1. setup (stuff that only ever happens once)
        // 2. resize (anything that's dependent on the size of the chart's parent element)
        // 3. update (stuff that changes anytime either the data or chart size does)
        // d3.select(window).on('resize', app.resize)

        // Pressing the space bar will toggle the animation.
        d3.select(window).on('keydown', function () {
            var event = d3.event

            switch (event.which) {
            case 32: // space
                app.toggleAnimation()
                break

            default:
                return
            }

            event.preventDefault()
        })

        // Hide the loading dialog and reveal the chart.
        d3.select('#loading')
            .transition()
            .style('opacity', 0)
            .remove()

        d3.select('#main')
            .style('opacity', 0)
            .style('display', 'block')
            .transition()
            .style('opacity', 1)

        // Let's move!
        app.toggleAnimation()
    },

    resize: function () {
        for (var component in app.components) {
            if (app.components[component].resize) {
                app.components[component].resize()
            }
        }
    },

    update: function () {
        for (var component in app.components) {
            if (app.components[component].update) {
                app.components[component].update()
            }
        }
    },

    setYear: function (year) {
        app.globals.selected.year = year;
        app.update()
    },

    incrementYear: function () {
        var availableYears = app.globals.available.years;
        var currentIdx = availableYears.indexOf(app.globals.selected.year);
        app.setYear(availableYears[(currentIdx + 1) % availableYears.length]);
    },

    toggleAnimation: function () {
        if (app.globals.animating) {
            app.interval.stop()
            d3.select('body').classed('animating', false)
            app.globals.animating = false
        } else {
            app.interval = d3.interval(app.incrementYear, ANIMATION_INTERVAL)
            d3.select('body').classed('animating', true)
            app.globals.animating = true
        }

        app.update()
    }
}

d3.csv(DATA_PATH, function (d) {
    // D3 will return everything as a string, so this first callback parses the numeric
    // columns in order to tell Javascript to treat them as numbers (it also switches the
    // column names to camelCase, which is more idiomatic Javascript).

    return {
        country: d.country,
        year: +d.year,
        lifeExpectancy: +d.life_expectancy,
        totalFertility: +d.total_fertility,
        population: +d.population,
        continent: d.continent
    }
}, app.initialize)
