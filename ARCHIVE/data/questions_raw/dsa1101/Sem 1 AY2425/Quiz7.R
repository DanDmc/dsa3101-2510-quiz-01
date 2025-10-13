#  Quiz 7 - LOGISTIC REGRESSION

data = read.csv("churn.csv")
head(data)
# Married: 1 = married; 0 = non-married
# Churned: 1 = yes; 0 = no

data$Married = as.factor(data$Married)

data= data[,-1] #Remove ID column

# LOGISTIC MODEL
M1<- glm(Churned ~ . , data = data)

M2<- glm(Churned ~ . , data = data, family = binomial)
summary(M2)

M3<- glm( Churned ~ Age + Churned_contacts, data = data,family = binomial)
summary(M3)

predict(M3, newdata = data.frame(Age = 50, Churned_contacts = 5), type = 'response')

