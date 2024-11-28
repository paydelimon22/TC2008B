from mesa import Agent
import heapq

class Bike(Agent):
    """
    Agent that moves randomly.
    Attributes:
        unique_id: Agent's ID
        direction: Randomly chosen direction chosen from one of eight directions
    """

    def __init__(self, unique_id, model, destination):
        """
        Creates a new random agent.
        Args:
            unique_id: The agent's ID
            model: Model reference for the agent
            destination: tuple containg the grid coords
        """
        super().__init__(unique_id, model)
        self.destination = destination
        self.destination_neighbors = []
        self.path = []
        self.direction = "Down"
        self.impatience = 0
        self.moving = False

    def get_distance(self, pos1, pos2):
        """
        Method used to calculate the distance between two points (Manhattan)
        """
        return (abs(pos2[0]-pos1[0]) + abs(pos2[1]-pos1[1]))

    def get_route(self):
        """
        Method to find the route to the destination using A*
        """
        avoid = None
        if self.path:
            avoid = self.path[0]

        #Define list with neighbor cells of the destination that are roads
        destination_neighborhood = self.model.grid.get_neighborhood(self.destination, moore=True, include_center = False)

        for neighbor_cells in destination_neighborhood:
            cell_agents = self.model.grid.get_cell_list_contents(neighbor_cells)
            for agent in cell_agents:
                if isinstance(agent, Road):
                    self.destination_neighbors.append(neighbor_cells)

        if self.pos in self.destination_neighbors:
            return
        
        open_list = [(0, self.pos)]
        closed_list = set()
        closed_list.add(avoid)

        #Dictionary to store parents 
        came_from = {}

        #Cost 
        g_score = {self.pos : 0}
        #Heuristic + Cost
        f_score = {self.pos: self.get_distance(self.pos, self.destination)}

        while open_list:
            #Current pos = (cost, position)
            current_pos = heapq.heappop(open_list)
            
            #Destination Reached
            if current_pos[1] in self.destination_neighbors:
                self.path = self.reconstruct_path(came_from, current_pos[1])
                return
            
            closed_list.add(current_pos)

            #For each of the possible cells from current_pos
            for neighbor in self.model.graph_get(current_pos[1]):
                
                #If the cell was already explored, skip
                if neighbor.pos in closed_list:
                    continue

                tentative_g_score = g_score[current_pos[1]] + 1 

                if neighbor.pos not in g_score or tentative_g_score < g_score[neighbor.pos]:

                    came_from[neighbor.pos] = current_pos[1]
                    g_score[neighbor.pos] = tentative_g_score
                    f_score[neighbor.pos] = tentative_g_score + self.get_distance(neighbor.pos, self.destination)

                    heapq.heappush(open_list, (f_score[neighbor.pos], neighbor.pos))

    def reconstruct_path(self, came_from, current_pos):
        """
        Auxiliary Method to reconstruct the path
        """
        path = []
        while current_pos in came_from:
            path.append(current_pos)
            current_pos = came_from[current_pos]
        path.reverse()
        return path
    
    def move(self):
        """
        Move the agent one cell in it's path
        """
        #Check if the first element of the path is empty
        # print(f"---------BIKE: {self.unique_id}, PATH: {self.path}, DESTINATION: {self.destination}-----------")
        
        #Find empty available neighbors
        empty_neighbors = []

        neighbors_list = [neighbor.pos for neighbor in self.model.graph_get(self.pos)]
        
        for neighbor in neighbors_list:
            bikes_found = [agent for agent in self.model.grid.get_cell_list_contents(neighbor) if isinstance(agent, Bike)]
            if len(bikes_found) == 0:
                empty_neighbors.append(neighbor)

        #If there are no available steps, wait
        if not empty_neighbors:
            self.moving = False
            self.impatience += 1
            #print(f"CASE 0: Bike {self.unique_id} waited at {self.pos} because there are no available neighbors")
            return
        
        #Try moving to the first road in path
        if self.path[0] in empty_neighbors:
            self.impatience = 0
            self.moving = True
            
            self.model.grid.move_agent(self, self.path.pop(0))
            self.direction = next(filter(
                lambda a: isinstance(a, Road),
                self.model.grid.get_cell_list_contents(self.pos)
            )).direction
            #print(f"CASE 1: Bike {self.unique_id} moved along it's path")
            return
        
        if len(self.path) == 1:
            self.moving = False
            self.impatience += 1
            #print(f"CASE 2: Bike {self.unique_id} is once step away from it's destination and waited at: {self.pos}")
            return

        #For each of the possible empty neighbors,
        #find the neighbor that can reach the next road in the path
        for neighbor in empty_neighbors:
            if self.path[1] in [neighbor.pos for neighbor in self.model.graph_get(neighbor)]:
                self.impatience = 0
                self.path.pop(0)
                self.moving = True

                self.model.grid.move_agent(self, neighbor)
                self.direction = next(filter(
                    lambda a: isinstance(a, Road),
                    self.model.grid.get_cell_list_contents(self.pos)
                )).direction
                #print(f"CASE 3: Bike {self.unique_id} moved towards {neighbor} by choosing an empty neighbor that stays on track")
                return
                 
        if self.impatience >= 3:
            print(f"CASE 4: Bike {self.unique_id} is recalculating it's route after becoming impatient")
            self.impatience = 0
            self.get_route()
            self.move()
            return
        
        self.moving = False
        self.impatience += 1
        #print(f"CASE 5: Bike {self.unique_id} is being patient")


    def step(self):
        """
        Determines the new direction it will take, and then moves
        """
        #Generate a path if it does not exist
        if not self.path:
            self.get_route()

        #Check if a traffic light exists at that position
        traffic_light = None
        cell_agents = self.model.grid.get_cell_list_contents(self.pos)

        for agent in cell_agents:
            if isinstance(agent, Traffic_Light):
                traffic_light = agent
        
        #If the agent is at a traffic light, wait
        if traffic_light and traffic_light.state:
            pass

        #If the agent is at it's destination, delete
        elif self.pos in self.destination_neighbors:
            #print(f"Agent: {self.unique_id} reached its destination!")
            self.model.bikes_arrived += 1
            self.model.grid.remove_agent(self)
            self.model.schedule.remove(self)
            self.model.deregister_agent(self)

        #Move
        else:
            self.move()


class Traffic_Light(Agent):
    """
    Traffic light. Where the traffic lights are in the grid.
    """

    def __init__(self, unique_id, model,
                 state=False, direction="Left", timeToChange=10):
        super().__init__(unique_id, model)
        """
        Creates a new Traffic light.
        Args:
            unique_id: The agent's ID
            model: Model reference for the agent
            state: Whether the traffic light is green or red
            timeToChange: After how many step should the traffic light change color 
        """
        self.direction = direction
        self.state = state
        self.timeToChange = timeToChange

    def step(self):
        """
        To change the state (green or red) of the traffic light in case you consider the time to change of each traffic light.
        """
        if self.model.schedule.steps % self.timeToChange == 0:
            self.state = not self.state


class Destination(Agent):
    """
    Destination agent. Where each car should go.
    """

    def __init__(self, unique_id, model):
        super().__init__(unique_id, model)

    def step(self):
        pass


class Obstacle(Agent):
    """
    Obstacle agent. Just to add obstacles to the grid.
    """

    def __init__(self, unique_id, model):
        super().__init__(unique_id, model)

    def step(self):
        pass


class Road(Agent):
    """
    Road agent. Determines where the cars can move, and in which direction.
    """

    def __init__(self, unique_id, model, direction="Left"):
        """
        Creates a new road.
        Args:
            unique_id: The agent's ID
            model: Model reference for the agent
            direction: Direction where the cars can move
        """
        super().__init__(unique_id, model)
        self.direction = direction

    def step(self):
        pass
