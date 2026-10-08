require 'java'

list = java.util.ArrayList.new
[1, 2, 3].each { |number| list.add(number * number) }
puts "jruby:#{list.size}:#{list.get(2)}"
