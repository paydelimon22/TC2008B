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
        print(f"AGENT {self.unique_id} constructed")

    def get_distance(self, pos1, pos2):
        """
        Method used to calculate the distance between two points (Manhattan)
        """
        return (abs(pos2[0]-pos1[0]) + abs(pos2[1]-pos1[1]))

    def get_route(self):
        """
        Method to find the route to the destination using A*
        """
        #Clear path before recalculating
        self.path.clear()

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
        if not self.path:
            self.get_route()

        traffic_light = None
        cell_agents = self.model.grid.get_cell_list_contents(self.pos)
        for agent in cell_agents:
            if isinstance(agent, Traffic_Light):
                traffic_light = agent
        
        if traffic_light and traffic_light.state:
            print(f"Agent {self.unique_id} is waiting for traffic light to change at pos: {self.pos}")
            next_step = self.pos

        #Check if the first element of the path is empty
        cell_empty = True
        agents_path = self.model.grid.get_cell_list_contents(self.path[0])
        for agent in agents_path:
            if isinstance(agent, Bike):
                cell_empty = False
        else:
            try:
                if cell_empty:
                    next_step = self.path.pop(0)
                else:
                    next_step = self.pos
            except Exception as e:
                # print(traceback.format_exc())
                # print(e)
                next_step = self.pos
        
        self.model.grid.move_agent(self, next_step)

    def step(self):
        """
        Determines the new direction it will take, and then moves
        """

        #When the agent reaches it's destination, delete
        if self.pos in self.destination_neighbors:
            print(f"Agent: {self.unique_id} reached its destination!")
            self.model.grid.remove_agent(self)
            self.model.schedule.remove(self)
            self.model.deregister_agent(self)

        else:
            self.move()


class Traffic_Light(Agent):
    """
    Traffic light. Where the traffic lights are in the grid.
    """

    def __init__(self, unique_id, model, state=False, timeToChange=10):
        super().__init__(unique_id, model)
        """
        Creates a new Traffic light.
        Args:
            unique_id: The agent's ID
            model: Model reference for the agent
            state: Whether the traffic light is green or red
            timeToChange: After how many step should the traffic light change color 
        """
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
