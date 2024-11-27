from mesa import Model
from mesa.time import RandomActivation
from mesa.space import MultiGrid
from .agent import Bike, Destination, Obstacle, Road, Traffic_Light
import json


class ParkModel(Model):
    """
    Creates a model based on a park map.
    """

    def __init__(self):
        super().__init__(self)
        # Load the map dictionary. The dictionary maps the characters in the map file to the corresponding agent.
        dataDictionary = json.load(open("park_files/mapDictionary.json"))

        self.traffic_lights = []
        self.graph = []

        # Load the map file. The map file is a text file where each character represents an agent.
        with open("park_files/2024_base.txt") as baseFile:
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
                                    direction = dataDictionary[road]
                                    agent = Road(
                                        f"r_{r*self.width+c}",
                                        self,
                                        direction
                                    )
                                    self.grid.place_agent(
                                        agent,
                                        (c, self.height - r - 1)
                                    )

                        elif col == "s":
                            for road in [lines[r][c - 1], lines[r][c + 1]]:
                                if road in [">", "<"]:
                                    direction = dataDictionary[road]
                                    agent = Road(
                                        f"r_{r*self.width+c}",
                                        self,
                                        direction
                                    )
                                    self.grid.place_agent(
                                        agent,
                                        (c, self.height - r - 1)
                                    )

                        agent = Traffic_Light(
                            f"tl_{r*self.width+c}",
                            self,
                            direction=direction,
                            state=False if col == "S" else True,
                            timeToChange=int(dataDictionary[col]),
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

        self.generate_graph()

    def step(self):
        """Advance the model by one step."""
        # Spawn new bikes every 10 episodes
        if self.schedule.steps % 10 == 0:
            self.spawn_bikes()

        if len(self.agents_by_type[Bike]) == len(self.agents_by_type[Road]):
            self.running = False
            return

        self.schedule.step()

    def spawn_bikes(self):
        """Spawn new bikes at the empty corners of the grid."""
        corners = [
            (0, 0),
            (0, self.height - 1),
            (self.width - 1, 0),
            (self.width - 1, self.height - 1)
        ]

        for corner in corners:
            clear = True
            for agent in self.grid.iter_cell_list_contents([corner]):
                if isinstance(agent, Bike):
                    clear = False
                    break

            if  not clear:
                break

            destination_pos = [destination.pos for destination in self.get_agents_of_type(Destination)]

            new_bike = Bike(self.next_id(), self, self.random.choice(destination_pos))
            self.grid.place_agent(new_bike, corner)
            self.schedule.add(new_bike)

    def get_possible_roads(self, road):
        neighbor_roads = [
            neighbor
            for neighbor in self.grid.get_neighbors(road.pos, moore=True, include_center=False)
            if isinstance(neighbor, Road)
        ]

        possible_roads = []

        for neighbor_road in neighbor_roads:
            if (
                road.direction == "Up"
                and neighbor_road.pos[1] == road.pos[1] + 1
            ):
                possible_roads.append(neighbor_road)
            elif (
                road.direction == "Down"
                and neighbor_road.pos[1] == road.pos[1] - 1
            ):
                possible_roads.append(neighbor_road)
            elif (
                road.direction == "Left"
                and neighbor_road.pos[0] == road.pos[0] - 1
            ):
                possible_roads.append(neighbor_road)
            elif (
                road.direction == "Right"
                and neighbor_road.pos[0] == road.pos[0] + 1
            ):
                possible_roads.append(neighbor_road)
        return possible_roads

    def generate_graph(self):
        for road in self.get_agents_of_type(Road):
            possible_roads = self.get_possible_roads(road)
            self.graph.append((road.pos, possible_roads))

    def graph_get(self, road):
        for node in self.graph:
            if road == node[0]:
                return node[1]