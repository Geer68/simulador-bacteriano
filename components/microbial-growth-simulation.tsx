"use client"

import { useEffect, useState } from "react"
import { Line } from "react-chartjs-2"
import "chart.js/auto"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PlayCircle, PauseCircle, RefreshCw, Download, Info, Printer } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"

// Default values
const DEFAULT_M = 20
const DEFAULT_SUBSTRATE = 50
const DEFAULT_TA = 10
const DEFAULT_TD = 5

// Function to create the initial grid with inoculum in the center
const createInitialGrid = (M, initialSubstrate, adaptationTime, duplicationTime) => {
  const grid = []
  for (let i = 0; i < M; i++) {
    const row = []
    for (let j = 0; j < M; j++) {
      row.push({
        occupied: false,
        substrate: initialSubstrate,
        adaptation: 0,
        duplication: duplicationTime,
      })
    }
    grid.push(row)
  }
  const center = Math.floor(M / 2)
  grid[center][center] = {
    occupied: true,
    substrate: initialSubstrate,
    adaptation: adaptationTime,
    duplication: duplicationTime,
  }
  return grid
}

// Function to get neighbors (8 directions)
const getNeighbors = (i, j, M) => {
  const neighbors = []
  for (let di = -1; di <= 1; di++) {
    for (let dj = -1; dj <= 1; dj++) {
      if (di === 0 && dj === 0) continue
      const ni = i + di,
        nj = j + dj
      if (ni >= 0 && ni < M && nj >= 0 && nj < M) {
        neighbors.push({ i: ni, j: nj })
      }
    }
  }
  return neighbors
}

// Brownian movement
const moverBrowniano = (grid, M, initialSubstrate, duplicationTime) => {
  const newGrid = grid.map((row) => row.map((cell) => ({ ...cell })))
  for (let i = 0; i < M; i++) {
    for (let j = 0; j < M; j++) {
      if (newGrid[i][j].occupied) {
        const neighbors = getNeighbors(i, j, M)
        neighbors.sort(() => Math.random() - 0.5)
        for (const n of neighbors) {
          if (!newGrid[n.i][n.j].occupied) {
            newGrid[n.i][n.j] = { ...newGrid[i][j] }
            newGrid[i][j] = {
              occupied: false,
              substrate: initialSubstrate,
              adaptation: 0,
              duplication: duplicationTime,
            }
            break
          }
        }
      }
    }
  }
  return newGrid
}

// Apply agitation
const aplicarAgitacion = (grid, M, initialSubstrate, duplicationTime) => {
  const newGrid = []
  for (let i = 0; i < M; i++) {
    const row = []
    for (let j = 0; j < M; j++) {
      row.push({
        occupied: false,
        substrate: initialSubstrate,
        adaptation: 0,
        duplication: duplicationTime,
      })
    }
    newGrid.push(row)
  }
  // Take cells from current grid
  const cells = []
  for (let i = 0; i < M; i++) {
    for (let j = 0; j < M; j++) {
      if (grid[i][j].occupied) {
        cells.push({
          adaptation: grid[i][j].adaptation,
          duplication: grid[i][j].duplication,
        })
      }
    }
  }
  // Redistribute randomly in the new grid
  cells.forEach((cell) => {
    let placed = false
    while (!placed) {
      const x = Math.floor(Math.random() * M)
      const y = Math.floor(Math.random() * M)
      if (!newGrid[x][y].occupied) {
        newGrid[x][y] = {
          occupied: true,
          substrate: initialSubstrate,
          adaptation: cell.adaptation,
          duplication: cell.duplication,
        }
        placed = true
      }
    }
  })
  return newGrid
}

// Simulate a growth step (consumption, adaptation, duplication)
const simularPaso = (grid, M, initialSubstrate, adaptationTime, duplicationTime) => {
  const newGrid = grid.map((row) => row.map((cell) => ({ ...cell })))
  for (let i = 0; i < M; i++) {
    for (let j = 0; j < M; j++) {
      if (newGrid[i][j].occupied) {
        // Substrate consumption
        if (newGrid[i][j].substrate > 0) {
          newGrid[i][j].substrate -= 1
        } else {
          // If depleted, cell dies
          newGrid[i][j].occupied = false
          continue
        }
        // Adaptation reduction
        if (newGrid[i][j].adaptation > 0) {
          newGrid[i][j].adaptation -= 1
        } else {
          // Decrease duplication
          if (newGrid[i][j].duplication > 0) {
            newGrid[i][j].duplication -= 1
          }
        }
        // Reproduction
        if (newGrid[i][j].duplication === 0) {
          const neighbors = getNeighbors(i, j, M)
          neighbors.sort(() => Math.random() - 0.5)
          for (const n of neighbors) {
            if (!newGrid[n.i][n.j].occupied) {
              newGrid[n.i][n.j] = {
                occupied: true,
                substrate: initialSubstrate,
                adaptation: adaptationTime,
                duplication: duplicationTime,
              }
              newGrid[i][j].duplication = duplicationTime
              break
            }
          }
        }
      }
    }
  }
  return newGrid
}

export default function MicrobialGrowthSimulation() {
  // Parameters
  const [M, setM] = useState(DEFAULT_M)
  const [initialSubstrate, setInitialSubstrate] = useState(DEFAULT_SUBSTRATE)
  const [adaptationTime, setAdaptationTime] = useState(DEFAULT_TA)
  const [duplicationTime, setDuplicationTime] = useState(DEFAULT_TD)

  // Three parallel simulations
  const [gridEstatico, setGridEstatico] = useState(
    createInitialGrid(M, initialSubstrate, adaptationTime, duplicationTime),
  )
  const [gridBrowniano, setGridBrowniano] = useState(
    createInitialGrid(M, initialSubstrate, adaptationTime, duplicationTime),
  )
  const [gridAgitacion, setGridAgitacion] = useState(
    createInitialGrid(M, initialSubstrate, adaptationTime, duplicationTime),
  )

  const [step, setStep] = useState(0)
  const [growthDataEstatico, setGrowthDataEstatico] = useState([])
  const [growthDataBrowniano, setGrowthDataBrowniano] = useState([])
  const [growthDataAgitacion, setGrowthDataAgitacion] = useState([])
  const [isRunning, setIsRunning] = useState(false)
  const [activeTab, setActiveTab] = useState("parameters")
  const [viewMode, setViewMode] = useState("chart")

  // Reset when parameters change
  useEffect(() => {
    resetSimulation()
  }, [M, initialSubstrate, adaptationTime, duplicationTime])

  const resetSimulation = () => {
    setGridEstatico(createInitialGrid(M, initialSubstrate, adaptationTime, duplicationTime))
    setGridBrowniano(createInitialGrid(M, initialSubstrate, adaptationTime, duplicationTime))
    setGridAgitacion(createInitialGrid(M, initialSubstrate, adaptationTime, duplicationTime))

    setStep(0)
    setGrowthDataEstatico([])
    setGrowthDataBrowniano([])
    setGrowthDataAgitacion([])
    setIsRunning(false)
  }

  // Update simulations in parallel
  useEffect(() => {
    if (!isRunning) return
    const interval = setInterval(() => {
      // Static
      setGridEstatico((prev) => {
        const nuevo = simularPaso(prev, M, initialSubstrate, adaptationTime, duplicationTime)
        const total = nuevo.flat().filter((c) => c.occupied).length
        setGrowthDataEstatico((prevData) => [...prevData, { step: step + 1, logNB: total > 0 ? Math.log(total) : 0 }])
        return nuevo
      })

      // Brownian
      setGridBrowniano((prev) => {
        let nuevo = simularPaso(prev, M, initialSubstrate, adaptationTime, duplicationTime)
        nuevo = moverBrowniano(nuevo, M, initialSubstrate, duplicationTime)
        const total = nuevo.flat().filter((c) => c.occupied).length
        setGrowthDataBrowniano((prevData) => [...prevData, { step: step + 1, logNB: total > 0 ? Math.log(total) : 0 }])
        return nuevo
      })

      // Agitation
      setGridAgitacion((prev) => {
        let nuevo = simularPaso(prev, M, initialSubstrate, adaptationTime, duplicationTime)
        if ((step + 1) % 50 === 0) {
          nuevo = aplicarAgitacion(nuevo, M, initialSubstrate, duplicationTime)
        }
        const total = nuevo.flat().filter((c) => c.occupied).length
        setGrowthDataAgitacion((prevData) => [...prevData, { step: step + 1, logNB: total > 0 ? Math.log(total) : 0 }])
        return nuevo
      })

      setStep((s) => s + 1)
    }, 200)

    return () => clearInterval(interval)
  }, [isRunning, M, initialSubstrate, adaptationTime, duplicationTime, step])

  // Prepare chart data
  const chartData = {
    labels: growthDataEstatico.map((d) => d.step),
    datasets: [
      {
        label: "Estático",
        data: growthDataEstatico.map((d) => d.logNB),
        borderColor: "rgba(59, 130, 246, 1)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.3,
      },
      {
        label: "Browniano",
        data: growthDataBrowniano.map((d) => d.logNB),
        borderColor: "rgba(239, 68, 68, 1)",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.3,
      },
      {
        label: "Agitación",
        data: growthDataAgitacion.map((d) => d.logNB),
        borderColor: "rgba(34, 197, 94, 1)",
        backgroundColor: "rgba(34, 197, 94, 0.1)",
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.3,
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        title: {
          display: true,
          text: "Tiempo (pasos)",
          font: {
            size: 14,
            weight: "bold",
          },
        },
        grid: {
          color: "rgba(0, 0, 0, 0.1)",
        },
      },
      y: {
        title: {
          display: true,
          text: "log(NB)",
          font: {
            size: 14,
            weight: "bold",
          },
        },
        grid: {
          color: "rgba(0, 0, 0, 0.1)",
        },
      },
    },
    plugins: {
      legend: {
        position: "top",
        labels: {
          boxWidth: 15,
          usePointStyle: true,
          pointStyle: "circle",
        },
      },
      tooltip: {
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        titleColor: "#000",
        bodyColor: "#000",
        borderColor: "rgba(0, 0, 0, 0.1)",
        borderWidth: 1,
        padding: 10,
        boxPadding: 5,
        usePointStyle: true,
        callbacks: {
          label: (context) => `${context.dataset.label}: ${context.raw.toFixed(3)}`,
        },
      },
    },
    animation: {
      duration: 0, // Disable animations for better performance
    },
  }

  // Calculate growth metrics
  const calculateMetrics = (data) => {
    if (data.length < 2) return { maxRate: 0, doubleTime: 0 }

    // Find the steepest part of the curve (max growth rate)
    let maxRate = 0
    let maxRateIndex = 0

    for (let i = 1; i < data.length; i++) {
      const rate = data[i].logNB - data[i - 1].logNB
      if (rate > maxRate) {
        maxRate = rate
        maxRateIndex = i
      }
    }

    // Calculate doubling time (time to double the population)
    const doubleTime = maxRate > 0 ? Math.log(2) / maxRate : 0

    return {
      maxRate: maxRate.toFixed(3),
      doubleTime: doubleTime.toFixed(2),
    }
  }

  const metricsEstatico = calculateMetrics(growthDataEstatico)
  const metricsBrowniano = calculateMetrics(growthDataBrowniano)
  const metricsAgitacion = calculateMetrics(growthDataAgitacion)

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 py-4 px-6 shadow-sm">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Simulación de Crecimiento Microbiano</h1>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={resetSimulation}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Reiniciar
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" disabled>
                    <Printer className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Imprimir resultados (deshabilitado)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" disabled>
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Descargar datos (deshabilitado)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto py-6 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left panel - Parameters */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Parámetros de Simulación</CardTitle>
                <CardDescription>Configure los parámetros para la simulación</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="dimension">Dimensión (M)</Label>
                      <span className="text-sm text-gray-500">{M}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="dimension"
                        type="number"
                        value={M}
                        onChange={(e) => setM(Number(e.target.value))}
                        className="w-20"
                        min="5"
                        max="50"
                      />
                      <Slider
                        value={[M]}
                        min={5}
                        max={50}
                        step={1}
                        onValueChange={(value) => setM(value[0])}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="substrate">Sustrato Inicial</Label>
                      <span className="text-sm text-gray-500">{initialSubstrate}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="substrate"
                        type="number"
                        value={initialSubstrate}
                        onChange={(e) => setInitialSubstrate(Number(e.target.value))}
                        className="w-20"
                        min="10"
                        max="200"
                      />
                      <Slider
                        value={[initialSubstrate]}
                        min={10}
                        max={200}
                        step={5}
                        onValueChange={(value) => setInitialSubstrate(value[0])}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="adaptation">Tiempo de Adaptación (Ta)</Label>
                      <span className="text-sm text-gray-500">{adaptationTime}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="adaptation"
                        type="number"
                        value={adaptationTime}
                        onChange={(e) => setAdaptationTime(Number(e.target.value))}
                        className="w-20"
                        min="0"
                        max="50"
                      />
                      <Slider
                        value={[adaptationTime]}
                        min={0}
                        max={50}
                        step={1}
                        onValueChange={(value) => setAdaptationTime(value[0])}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="duplication">Tiempo de Duplicación (Td)</Label>
                      <span className="text-sm text-gray-500">{duplicationTime}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="duplication"
                        type="number"
                        value={duplicationTime}
                        onChange={(e) => setDuplicationTime(Number(e.target.value))}
                        className="w-20"
                        min="1"
                        max="20"
                      />
                      <Slider
                        value={[duplicationTime]}
                        min={1}
                        max={20}
                        step={1}
                        onValueChange={(value) => setDuplicationTime(value[0])}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button
                    className="w-full"
                    onClick={() => setIsRunning(!isRunning)}
                    variant={isRunning ? "destructive" : "default"}
                  >
                    {isRunning ? (
                      <>
                        <PauseCircle className="mr-2 h-4 w-4" />
                        Detener Simulación
                      </>
                    ) : (
                      <>
                        <PlayCircle className="mr-2 h-4 w-4" />
                        Iniciar Simulación
                      </>
                    )}
                  </Button>
                </div>

                <div className="pt-4 border-t space-y-4">
                  <h3 className="font-medium text-sm">Métricas de Crecimiento</h3>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                        <span className="text-sm font-medium">Estático</span>
                      </div>
                      <div className="text-sm">
                        <div>Tasa máx: {metricsEstatico.maxRate}</div>
                        <div>T. duplicación: {metricsEstatico.doubleTime}h</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                        <span className="text-sm font-medium">Browniano</span>
                      </div>
                      <div className="text-sm">
                        <div>Tasa máx: {metricsBrowniano.maxRate}</div>
                        <div>T. duplicación: {metricsBrowniano.doubleTime}h</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                        <span className="text-sm font-medium">Agitación</span>
                      </div>
                      <div className="text-sm">
                        <div>Tasa máx: {metricsAgitacion.maxRate}</div>
                        <div>T. duplicación: {metricsAgitacion.doubleTime}h</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right panel - Visualization */}
          <div className="lg:col-span-2">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle>Visualización de Resultados</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">
                      Paso: {step}
                    </Badge>
                    <div className="flex border rounded-md overflow-hidden">
                      <Button
                        variant={viewMode === "chart" ? "secondary" : "ghost"}
                        size="sm"
                        className="rounded-none h-8 px-3"
                        onClick={() => setViewMode("chart")}
                      >
                        Gráfico
                      </Button>
                      <Button
                        variant={viewMode === "grid" ? "secondary" : "ghost"}
                        size="sm"
                        className="rounded-none h-8 px-3"
                        onClick={() => setViewMode("grid")}
                      >
                        Cuadrículas
                      </Button>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Info className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">
                            Esta simulación muestra el crecimiento microbiano en tres modos diferentes: Estático (sin
                            movimiento), Browniano (movimiento aleatorio) y Agitación (redistribución periódica).
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-4">
                {viewMode === "chart" ? (
                  <div className="h-[500px] w-full">
                    <Line data={chartData} options={chartOptions} />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex flex-col items-center">
                      <h3 className="font-medium mb-2 flex items-center">
                        <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                        Estático
                      </h3>
                      <div
                        className="grid gap-[1px] border bg-gray-100"
                        style={{
                          gridTemplateColumns: `repeat(${M}, 1fr)`,
                          width: "100%",
                          aspectRatio: "1/1",
                        }}
                      >
                        {gridEstatico.flat().map((cell, index) => (
                          <div
                            key={index}
                            className={`${cell.occupied ? "bg-blue-500" : "bg-white"}`}
                            style={{
                              width: "100%",
                              paddingBottom: "100%",
                            }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col items-center">
                      <h3 className="font-medium mb-2 flex items-center">
                        <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                        Browniano
                      </h3>
                      <div
                        className="grid gap-[1px] border bg-gray-100"
                        style={{
                          gridTemplateColumns: `repeat(${M}, 1fr)`,
                          width: "100%",
                          aspectRatio: "1/1",
                        }}
                      >
                        {gridBrowniano.flat().map((cell, index) => (
                          <div
                            key={index}
                            className={`${cell.occupied ? "bg-red-500" : "bg-white"}`}
                            style={{
                              width: "100%",
                              paddingBottom: "100%",
                            }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col items-center">
                      <h3 className="font-medium mb-2 flex items-center">
                        <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                        Agitación
                      </h3>
                      <div
                        className="grid gap-[1px] border bg-gray-100"
                        style={{
                          gridTemplateColumns: `repeat(${M}, 1fr)`,
                          width: "100%",
                          aspectRatio: "1/1",
                        }}
                      >
                        {gridAgitacion.flat().map((cell, index) => (
                          <div
                            key={index}
                            className={`${cell.occupied ? "bg-green-500" : "bg-white"}`}
                            style={{
                              width: "100%",
                              paddingBottom: "100%",
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 py-4 px-6">
        <div className="container mx-auto text-center text-sm text-gray-500">
          <p>Simulador de Crecimiento Microbiano v1.0 | Desarrollado con fines educativos</p>
        </div>
      </footer>
    </div>
  )
}
