class GroovySmoke {
    static void main(String[] args) {
        def squares = [1, 2, 3].collect { value -> value * value }
        def selected = squares.findAll { value -> value >= 4 }
        def result = "groovy:${selected.join(',')}:${squares.sum()}"
        if (result != 'groovy:4,9:14') {
            throw new AssertionError(result)
        }
        println result
    }
}
