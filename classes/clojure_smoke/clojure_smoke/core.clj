(ns clojure_smoke.core
  (:gen-class))

(defn summarize [numbers]
  (let [odd-squares (mapv #(* % %) (filter odd? numbers))]
    {:sum (reduce + 0 odd-squares)
     :count (count odd-squares)}))

(defn -main [& _args]
  (let [result (summarize [1 2 3 4 5])]
    (println (str "clojure:" (:sum result) ":" (:count result)))))
