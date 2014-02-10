class Source < ActiveRecord::Base
  has_many :likes, as: :likable
  validates :name, presence: true
  
  has_many :history
  has_many :topics, through: :history
  has_many :users, through: :history

end