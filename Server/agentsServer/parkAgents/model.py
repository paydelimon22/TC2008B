from mesa import Model
from mesa.time import RandomActivation
from mesa.space import MultiGrid
from .agent import *
import json


class ParkModel(Model):
    """
    Creates a model based on a park map.

    Args:
        N: Number of agents in the simulation
    """

    def __init__(self):
        super().__init__(self)
        # Load the map dictionary. The dictionary maps the characters in the map file to the corresponding agent.
        dataDictionary = json.load(open("park_files/mapDictionary.json"))

        self.traffic_lights = []

        # Load the map file. The map file is a text file where each character represents an agent.
        with open("park_files/2022_base.txt") as baseFile:
            lines = baseFile.readlines()
            self.width = len(lines[0]) - 1
            self.height = len(lines)

            self.grid = MultiGrid(self.width, self.height, torus=False)
            self.schedule = RandomActivation(self)

            # Goes through each character in the map file and creates the corresponding agent.
            for r, row in enumerate(lines):
                for c, col in enumerate(row):
                    if col in ["v", "^", ">", "<"]:
                        agent = Road(
                            f"r_{r*self.width+c}", self, dataDictionary[col]
                        )
                        self.grid.place_agent(agent, (c, self.height - r - 1))

                    elif col in ["S", "s"]:
                        # Spawn road tile under traffic_light.
                        if col == "S":
                            for road in [lines[r - 1][c], lines[r + 1][c]]:
                                if road in ["v", "^"]:
                                    agent = Road(
                                        f"r_{r*self.width+c}",
                                        self,
                                        dataDictionary[road]
                                    )
                                    self.grid.place_agent(
                                        agent,
                                        (c, self.height - r - 1)
                                    )

                        elif col == "s":
                            for road in [lines[r][c - 1], lines[r][c + 1]]:
                                if road in [">", "<"]:
                                    agent = Road(
                                        f"r_{r*self.width+c}",
                                        self,
                                        dataDictionary[road]
                                    )
                                    self.grid.place_agent(
                                        agent,
                                        (c, self.height - r - 1)
                                    )

                        agent = Traffic_Light(
                            f"tl_{r*self.width+c}",
                            self,
                            False if col == "S" else True,
                            int(dataDictionary[col]),
                        )
                        self.grid.place_agent(agent, (c, self.height - r - 1))
                        self.schedule.add(agent)
                        self.traffic_lights.append(agent)

                    elif col == "#":
                        agent = Obstacle(f"ob_{r*self.width+c}", self)
                        self.grid.place_agent(agent, (c, self.height - r - 1))

                    elif col == "D":
                        # Spawn obstacle tile under destination.
                        agent = Obstacle(f"ob_{r*self.width+c}", self)
                        self.grid.place_agent(agent, (c, self.height - r - 1))

                        agent = Destination(f"d_{r*self.width+c}", self)
                        self.grid.place_agent(agent, (c, self.height - r - 1))

        self.spawn_bikes()

        self.running = True

    def step(self):
        """Advance the model by one step."""
        # Spawn new bikes every 10 episodes
        if self.schedule.steps % 10 == 0:
            self.spawn_bikes()

        if len(self.agents_by_type["Bike"]) == len(self.agents_by_type["Road"]):
            self.running = False
            return

        self.schedule.step()

    def spawn_bikes(self):
        """Spawn new bikes at the empty corners of the grid."""
        corners = [
            (0, 0),
            (0, self.height),
            (self.width, 0),
            (self.width, self.height)
        ]

        for corner in corners:
            clear = True
            for agent in self.grid.iter_cell_list_contents([corner]):
                if isInstance(agent, Bike):
                    clear = False
                    break

            if  not clear:
                break

            new_bike = Bike(self.next_id(), self)
            self.grid.place_agent(new_bike, corner)
            self.schedule.add(new_bike)
